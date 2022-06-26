/*
	Adopted from https://github.com/webpack/webpack
*/
'use strict';

import ConstDependency from 'webpack/lib/dependencies/ConstDependency.js';
import ProvidedDependency from 'webpack/lib/dependencies/ProvidedDependency.js';
import JavascriptParserHelpers from 'webpack/lib/javascript/JavascriptParserHelpers.js';

/** @typedef {import('./Compiler')} Compiler */

export default class ExcludeProvidePlugin {
	/**
	 * @param {{definitions: Record<string, string | string[]>, exclude?: (RegExp|string)[]}} options the provided identifiers
	 */
	constructor({ definitions, exclude }) {
		this.definitions = definitions;
		this.exclude = exclude;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			'ProvidePlugin',
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyTemplates.set(
					ConstDependency,
					new ConstDependency.Template()
				);
				compilation.dependencyFactories.set(
					ProvidedDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					ProvidedDependency,
					new ProvidedDependency.Template()
				);
				const handler = parser => {
					Object.keys(this.definitions).forEach(name => {
						const request = [].concat(this.definitions[name]);
						const splittedName = name.split('.');
						if (splittedName.length > 0) {
							splittedName.slice(1).forEach((_, i) => {
								const name = splittedName.slice(0, i + 1).join('.');
								parser.hooks.canRename
									.for(name)
									.tap('ProvidePlugin', JavascriptParserHelpers.approve);
							});
						}

						parser.hooks.expression.for(name).tap('ProvidePlugin', expr => {
							for (const exclude of this.exclude) {
								if (exclude.test(parser.state.module.request)) {
									return false;
								}
							}
							const nameIdentifier = name.includes('.')
								? `__webpack_provided_${name.replace(/\./g, '_dot_')}`
								: name;
							const dep = new ProvidedDependency(
								request[0],
								nameIdentifier,
								request.slice(1),
								expr.range
							);
							dep.loc = expr.loc;
							parser.state.module.addDependency(dep);
							return true;
						});

						parser.hooks.call.for(name).tap('ProvidePlugin', expr => {
							const nameIdentifier = name.includes('.')
								? `__webpack_provided_${name.replace(/\./g, '_dot_')}`
								: name;
							const dep = new ProvidedDependency(
								request[0],
								nameIdentifier,
								request.slice(1),
								expr.callee.range
							);
							dep.loc = expr.callee.loc;
							parser.state.module.addDependency(dep);
							parser.walkExpressions(expr.arguments);
							return true;
						});
					});
				};
				normalModuleFactory.hooks.parser
					.for('javascript/auto')
					.tap('ProvidePlugin', handler);
				normalModuleFactory.hooks.parser
					.for('javascript/dynamic')
					.tap('ProvidePlugin', handler);
				normalModuleFactory.hooks.parser
					.for('javascript/esm')
					.tap('ProvidePlugin', handler);
			}
		);
	}
}
