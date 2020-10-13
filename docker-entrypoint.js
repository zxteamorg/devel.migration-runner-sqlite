#!/usr/bin/env node

"use strict";

const { ManualCancellationTokenSource, sleep } = require("@zxteam/cancellation");
const { CancelledError } = require("@zxteam/errors");
const { logger: rootLogger } = require("@zxteam/logger");
const { MigrationSources } = require("@zxteam/sql");
const { SqliteMigrationManager, SqliteProviderFactory } = require("@zxteam/sql-sqlite");

const appLogger = rootLogger.getLogger("migration-runner-sqlite");
const appCancellationTokenSource = new ManualCancellationTokenSource();

let destroyRequestCount = 0
const shutdownSignals = Object.freeze(["SIGTERM", "SIGINT"]);

async function gracefulShutdown(signal) {
	if (destroyRequestCount++ === 0) {
		appCancellationTokenSource.cancel();

		if (appLogger.isInfoEnabled) {
			appLogger.info(`Interrupt signal received: ${signal}`);
		}
	} else {
		if (appLogger.isInfoEnabled) {
			appLogger.info(`Interrupt signal (${destroyRequestCount}) received: ${signal}`);
		}
	}
}
shutdownSignals.forEach((signal) => process.on(signal, () => gracefulShutdown(signal)));

async function install(databaseFile, sleepBeforeAction, targetVersion) {
	const installLogger = appLogger.getLogger("install");

	const startDate = new Date();

	installLogger.info("Prepare database connection...");
	const sqlProviderFactory = new SqliteProviderFactory({
		url: new URL(`file+sqlite:///data/work/${databaseFile}`),
		log: installLogger.getLogger("factory")
	});
	if (!await sqlProviderFactory.isDatabaseExists(appCancellationTokenSource.token)) {
		await sqlProviderFactory.newDatabase(appCancellationTokenSource.token)
	}

	installLogger.info(`Loading migration scripts from /data/dist ...`);
	const migrationSources = await MigrationSources.loadFromFilesystem(
		appCancellationTokenSource.token,
		"/data/dist"
	);

	const manager = new SqliteMigrationManager({
		migrationSources, sqlProviderFactory,
		log: installLogger.getLogger("migration")
	});

	installLogger.info("Obtaining current database version...");
	const currentDatabaseVersion = await manager.getCurrentVersion(appCancellationTokenSource.token);
	installLogger.info(`Current database version is '${currentDatabaseVersion}'.`);

	if (sleepBeforeAction) {
		// Sleep a little bit (may be user will want to avoid installation)

		if (targetVersion !== null) {
			installLogger.info(`Target version '${targetVersion}' to install.`);
		} else {
			installLogger.info("Target version is not defined. Using latest version to install.");
		}

		installLogger.info("Sleep a little bit before install scripts (you are able to cancel Ctrl+C the process yet)...");
		await sleep(appCancellationTokenSource.token, 8000);
	}

	if (targetVersion !== null) {
		installLogger.info(`Installing migration scripts to target version '${targetVersion}'...`);
		await manager.install(appCancellationTokenSource.token, targetVersion);
	} else {
		installLogger.info(`Installing migration scripts to latest version...`);
		await manager.install(appCancellationTokenSource.token);
	}

	const endDate = new Date();
	const secondsDiff = (endDate.getTime() - startDate.getTime()) / 1000;
	installLogger.info(`Done in ${secondsDiff} seconds.`);
}

async function rollback(databaseFile, sleepBeforeAction, targetVersion) {
	const rollbackLogger = appLogger.getLogger("rollback");

	const startDate = new Date();

	rollbackLogger.info("Prepare database connection...");
	const sqlProviderFactory = new SqliteProviderFactory({
		url: new URL(`file+sqlite:///data/work/${databaseFile}`),
		log: rollbackLogger.getLogger("factory")
	});
	if (!await sqlProviderFactory.isDatabaseExists(appCancellationTokenSource.token)) {
		rollbackLogger.warn("Database is not exists. Nothing to do.");
		return;
	}

	rollbackLogger.info(`Loading migration scripts from /data/dist ...`);
	const migrationSources = await MigrationSources.loadFromFilesystem(
		appCancellationTokenSource.token,
		"/data/dist"
	);

	const manager = new SqliteMigrationManager({
		migrationSources, sqlProviderFactory,
		log: rollbackLogger.getLogger("migration")
	});

	rollbackLogger.info("Obtaining current database version...");
	const currentDatabaseVersion = await manager.getCurrentVersion(appCancellationTokenSource.token);
	rollbackLogger.info(`Current database version is '${currentDatabaseVersion}'.`);

	if (sleepBeforeAction) {
		// Sleep a little bit (may be user will want to avoid installation)

		if (targetVersion !== null) {
			rollbackLogger.info(`Target version '${targetVersion}' to install.`);
		} else {
			rollbackLogger.info("Target version is not defined. Using latest version to install.");
		}

		rollbackLogger.info("Sleep a little bit before install scripts (you are able to cancel Ctrl+C the process yet)...");
		await sleep(appCancellationTokenSource.token, 8000);
	}

	if (targetVersion !== null) {
		rollbackLogger.info(`Rollback migration scripts to target version '${targetVersion}'...`);
		await manager.rollback(appCancellationTokenSource.token, targetVersion);
	} else {
		rollbackLogger.info(`Rollback ALL migration scripts...`);
		await manager.rollback(appCancellationTokenSource.token);
	}

	const endDate = new Date();
	const secondsDiff = (endDate.getTime() - startDate.getTime()) / 1000;
	rollbackLogger.info(`Done in ${secondsDiff} seconds.`);
}

async function main() {
	console.log(process.argv);
	if (process.argv.length < 2) {
		console.log("Usage:");
		console.log("	<install | rollback> [--no-sleep]");
		process.exit(1);
	} else {
		const action = process.argv[2];
		const sleepBeforeAction = !process.argv.includes("--no-sleep");
		const targetVersion = process.env.TARGET_VERSION || null;
		const databaseFile = process.env.DATABASE_FILE || "database.db";
		if (!/^[A-Za-z0-9\.]+/.test(databaseFile)) {
			console.error(`Wrong value DATABASE_FILE: '${databaseFile}'.`);
			return process.exit(4);
		}

		switch (action) {
			case "install": return install(databaseFile, sleepBeforeAction, targetVersion);
			case "rollback": return rollback(databaseFile, sleepBeforeAction, targetVersion);
			default: {
				console.error(`Unsupported action: '${action}'.`);
				process.exit(127);
			}
		}
	}
}

main().then(
	function () { process.exit(0); }
).catch(
	function (reason) {
		let exitCode;
		if (reason instanceof CancelledError) {
			appLogger.warn("Application cancelled by user");
			exitCode = 42;
		} else {
			appLogger.fatal("Application crashed", reason);
			exitCode = 127;
		}
		const timeout = setTimeout(guardForMissingLoggerCallback, 5000);
		const finalExitCode = exitCode;
		function guardForMissingLoggerCallback() {
			// This guard resolve promise, if log4js does not call shutdown callback
			process.exit(finalExitCode);
		}
		require('log4js').shutdown(function (log4jsErr) {
			if (log4jsErr) {
				console.error("Failure log4js.shutdown:", log4jsErr);
			}
			clearTimeout(timeout);
			process.exit(finalExitCode);
		});
	}
);
