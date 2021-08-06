/// <reference types="minecraft-addon-toolchain/v1" />
 const { series, dest } = require("gulp");
 const fs = require("fs");
//const fsPromises = require("fs/promises");

// const tap = require("gulp-tap");
// const log = require("gulplog");
// const pump = require("pump");
 const path = require("path");

/**
 * @type{IPlugin}
 */
class AutoFileGenerationSupport {
	constructor() {
		this.intermediateDir = "./out/before-plugin";
		this.bundleSources = [
			"scripts/plugin/index.js",
			"scripts/plugin/*/index.js",
			"scripts/plugin/plugins.json"
		];
		this.writeBack = true;
		this.bundleDir = undefined;

		const _this = this;
		this.sourceTasks = [
			{
				condition: this.bundleSources,
				preventDefault: false,
				task: pack => 
					dest([path.posix.join(this.intermediateDir, pack.relativePath)])
				
			}
		];
	}

	set builder(builder) {
		if (builder._version < 1) {
			throw new Error(
				"browserify support requires using a minecraft-addon-toolchain with at least version 1 or higher"
			);
		}
		this._builder = builder;
	}

	addDefaultTasks(gulpTasks) {
		const generateFile = this._generateFile.bind(this);
		generateFile.displayName = "generateFile";

		gulpTasks.buildSource = series(gulpTasks.buildSource, generateFile);
	}

	_generateFile(done) {
		return this._builder.foreachPack(
			"browserify",
			"behavior",
			(pack, packDone) => {
				const sourceDir = path.join(
					this._builder.sourceDir,
					pack.relativePath
				);
				const packDir = path.join(
					this.intermediateDir,
					pack.relativePath
				);
				const destination = path.join(
					this.bundleDir || this._builder.bundleDir,
					pack.relativePath
				);
				function getPluginsJSONSync() {
					try {
						let jsonData = fs.readFileSync(path.join(
							packDir,
							'scripts/plugin/plugins.json'
						));
						return JSON.parse(jsonData);
					} catch {
						return null;
					}
				}
				function havePluginJsSync() {
					try {
						fs.accessSync(path.join(
							packDir,
							'scripts/plugin/index.js'
						));
						return true;
					} catch {
						return false;
					}
				}
				function getPluginDirsSync() {
					let dirs = fs.readdirSync(path.join(
						packDir,
						'scripts/plugin'
					));
					return dirs.filter((dir) => {
						try {
							fs.accessSync(path.join(
								packDir,
								'scripts/plugin',
								dir,
								'index.js'
							));
							return true;
						} catch {
							return false;
						}
					});
				}
				if(havePluginJsSync()) {
					return packDone();
				}
				let pluginJSON = getPluginsJSONSync();
				let pluginDirs = getPluginDirsSync();
				let isModified = false;
				if(pluginJSON === null) {
					pluginJSON = {};
					isModified = true;
				}
				for(let dirName of pluginDirs) {
					if(pluginJSON[dirName] === undefined) {
						console.log(`Add dir ${dirName}`);
						pluginJSON[dirName] = {
							type: "inner",
							enable: true
						};
						isModified = true;
					}
				}
				let pluginJs = `
/*
** This file is automatically generated,
** to know more, see file-generation.js
*/
`
				+ Object.keys(pluginJSON).map((pluginName) => {
					let plugin = pluginJSON[pluginName];
					if(plugin === false) {
						return '';
					}
					if(!plugin.enable) {
						return '\n';
					}
					switch(plugin.type) {
					case 'inner':
						return `import './${pluginName}/index.js';\n`;
						break;
					default:
						let err = new Error(
							`Unknown type ${plugin.type} of plugin ${pluginName}`
						);
						packDone(err);
						throw err;
						break;
					}
				}).join('');
				if(this.writeBack && isModified) {
					fs.writeFileSync(path.join(
						sourceDir,
						'scripts/plugin/plugins.json'
					), JSON.stringify(pluginJSON, null, '\t').concat('\n'));
				}
				fs.writeFileSync(path.join(
					destination,
					'scripts/plugin/index.js'
				), pluginJs);
				return packDone();
			},
			done
		);
	}
}

module.exports = AutoFileGenerationSupport;