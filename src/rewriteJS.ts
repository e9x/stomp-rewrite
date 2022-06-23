import { generate } from '@javascript-obfuscator/escodegen';
import { builders as b } from 'ast-types';
import { parse } from 'meriyah';

import {
	AcornContext,
	AcornIterator,
	LazyGenerate,
	ctxReplacement,
} from './acornUtil';
import { ACCESS_KEY } from './inject/modules/Access';
import { createDataURI, parseDataURI, routeURL } from './routeURL';
import StompURL from './StompURL';

// smaller range inside larger range = invalidates larger range
// smaller modifications called later in script

export const PROVIDERS = ['window', 'document'];
export const UNDEFINABLE = ['eval', 'location', 'top'];

export const CLIENT_KEY = '(stomp)';

const cTarget = 't$t';
const cProp = 't$p';
const cValue = 't$v';

function generatePartial(script: string, ctx: AcornContext) {
	let result = ctx.node[ctxReplacement]
		? generate(ctx.node)
		: script.slice(ctx.node.range[0], ctx.node.range[1]);

	if (
		ctx.node.type.includes('Expression') &&
		ctx.parent?.node.type.includes('Expression')
	) {
		result = `(${result})`;
	}

	return result;
}

export function routeJS(resource: StompURL, url: StompURL, module = false) {
	if (resource.url.protocol === 'data:') {
		const { mime, data, attributes } = parseDataURI(resource.url.pathname);
		return createDataURI({
			mime,
			data: modifyJS(data, url, module),
			attributes,
		});
	}

	return routeURL('js', resource);
}

export function modifyJS(script: string, url: StompURL, module = false) {
	const lazy = new LazyGenerate();

	const tree = parse(script, {
		module,
		next: true,
		specDeviation: true,
		ranges: true,
	});

	for (const ctx of new AcornIterator(tree)) {
		typeLoop: switch (ctx.node.type) {
			/*case 'ImportExpression':
				// todo: add tompc$.import(meta, url)
				modify.replace(
					ctx,
					b.importExpression(
						b.callExpression(
							b.memberExpression(
								b.memberExpression(
									b.identifier(global_client),
									b.identifier('eval')
								),
								b.identifier('import')
							),
							[
								b.metaProperty(b.identifier('import'), b.identifier('meta')),
								ctx.node.source,
							]
						)
					)
				);

				break;
			case 'ImportDeclaration':
				console.log(ctx.node);
				modify.replace(
					ctx,
					b.importDeclaration(
						ctx.node.specifiers,
						b.literal(this.serve(new URL(ctx.node.source.value, url), url))
					)
				);
				// TODO : FIX
				break;
			case 'CallExpression':
				const { callee } = ctx.node;

				if (
					callee.type === 'Identifier' &&
					callee.name === 'eval' &&
					ctx.node.arguments.length
				) {
					/* May be a JS eval function!
						eval will only inherit the scope if the following is met:
						the keyword (not property or function) eval is called
						the keyword doesnt reference a variable named eval
						* /

					// transform eval(...) into eval(...tompc$.eval.eval_scope(eval, ...['code',{note:"eval is possibly a var"}]))
					modify.replace(
						ctx,
						b.callExpression(b.identifier('eval'), [
							b.spreadElement(
								b.callExpression(
									b.memberExpression(
										b.memberExpression(
											b.identifier(global_client),
											b.identifier('eval')
										),
										b.identifier('eval_scope')
									),
									[b.identifier('eval'), ...ctx.node.arguments]
								)
							),
						])
					);
				}

				break;*/
			/*case 'Identifier':
				if (
					ctx.parent.type === 'ArrayPattern' ||
					ctx.parent.type === 'ObjectPattern'
				)
					break;
				if (
					ctx.parent.type === 'MemberExpression' &&
					ctx.parent_key === 'property'
				)
					break; // window.location;
				if (ctx.parent.type === 'LabeledStatement') break; // { location: null, };
				if (ctx.parent.type === 'VariableDeclarator' && ctx.parent_key === 'id')
					break;
				if (ctx.parent.type === 'Property' && ctx.parent_key === 'key') break;
				if (ctx.parent.type === 'MethodDefinition') break;
				if (ctx.parent.type === 'ClassDeclaration') break;
				if (ctx.parent.type === 'RestElement') break;
				if (ctx.parent.type === 'ExportSpecifier') break;
				if (ctx.parent.type === 'ImportSpecifier') break;
				if (
					(ctx.parent.type === 'FunctionDeclaration' ||
						ctx.parent.type === 'FunctionExpression' ||
						ctx.parent.type === 'ArrowFunctionExpression') &&
					ctx.parent_key === 'params'
				)
					break;
				if (
					(ctx.parent.type === 'FunctionDeclaration' ||
						ctx.parent.type === 'FunctionExpression') &&
					ctx.parent_key === 'id'
				)
					break;
				if (
					ctx.parent.type === 'AssignmentPattern' &&
					ctx.parent_key === 'left'
				)
					break;
				if (!undefinable.includes(ctx.node.name)) break;

				if (
					ctx.parent.type === 'UpdateExpression' ||
					(ctx.parent.type === 'AssignmentExpression' &&
						ctx.parent_key === 'left')
				) {
					modify.replace(
						ctx.parent,
						b.callExpression(
							b.memberExpression(global_access, b.identifier('set1')),
							[
								ctx.node,
								b.literal(ctx.node.name),
								// return what the intended value is
								b.arrowFunctionExpression(
									[
										b.identifier(c_target),
										b.identifier(c_prop),
										b.identifier(c_value),
									],
									ctx.parent.type === 'UpdateExpression'
										? b.updateExpression(
												ctx.parent.node.operator,
												b.memberExpression(
													b.identifier(c_target),
													b.identifier(c_prop),
													true
												),
												ctx.parent.node.prefix
										  )
										: b.assignmentExpression(
												ctx.parent.node.operator,
												b.memberExpression(
													b.identifier(c_target),
													b.identifier(c_prop),
													true
												),
												b.identifier(c_value)
										  )
								),
								// set
								b.arrowFunctionExpression(
									[b.identifier(c_value)],
									b.assignmentExpression('=', ctx.node, b.identifier(c_value))
								),
								ctx.parent.type === 'UpdateExpression'
									? b.identifier('undefined')
									: ctx.parent.node.right,
								b.literal(this.generate_part(code, ctx.parent)),
							]
						)
					);
				} else {
					modify.replace(
						ctx,
						b.callExpression(
							b.memberExpression(global_access, b.identifier('get')),
							[ctx.node, b.literal(ctx.node.name)]
						)
					);
				}

				break;*/
			case 'MemberExpression':
				{
					/*lazy.replace(
					ctx,
					b.memberExpression(
						b.identifier('test'),
						noResult(
							b.memberExpression(
								ctx.node.object,
								ctx.node.property,
								ctx.node.computed
							)
						)
					)
				);
*/
					switch (ctx.parent?.node.type) {
						case 'ArrayPattern':
						case 'ObjectPattern':
							break typeLoop;
						case 'UnaryExpression':
							if (ctx.parent.node.operator === 'delete') break typeLoop;
							break;
					}

					if (ctx.node.computed) {
						if (ctx.node.object.type === 'Super') {
							break typeLoop;
						}

						if (ctx.node.property.type === 'Literal') {
							if (!UNDEFINABLE.includes(ctx.node.property.value)) {
								break typeLoop;
							}
						}
					} else
						switch (ctx.node.property.type) {
							case 'Identifier':
								if (!UNDEFINABLE.includes(ctx.node.property.name)) {
									break typeLoop;
								}

								break;
							case 'Literal':
								if (!UNDEFINABLE.includes(ctx.node.property.value)) {
									break typeLoop;
								}

								break;
						}

					// if not computed (object.property), make property a string
					// computed is object[property]

					let property_argument;

					// TODO: run property_argument through rewriter
					// object[location[location]]
					if (ctx.node.computed) {
						property_argument = ctx.node.property;
					} else if (ctx.node.property.type === 'Identifier') {
						property_argument = b.literal(ctx.node.property.name);
					}

					if (
						ctx.parent?.node.type === 'NewExpression' &&
						ctx.parentKey === 'callee'
					) {
						lazy.replace(
							ctx.parent,
							b.callExpression(
								b.memberExpression(
									b.identifier(ACCESS_KEY),
									b.identifier('new2')
								),
								[
									ctx.node.object,
									property_argument,
									b.arrayExpression(ctx.parent.node.arguments),
									b.literal(generatePartial(script, ctx.parent)),
								]
							)
						);
					} else if (
						ctx.parent?.node.type === 'CallExpression' &&
						ctx.parentKey === 'callee'
					) {
						lazy.replace(
							ctx.parent,
							b.callExpression(
								b.memberExpression(
									b.identifier(ACCESS_KEY),
									b.identifier('call2')
								),
								[
									ctx.node.object,
									property_argument,
									b.arrayExpression(ctx.parent.node.arguments),
									b.literal(generatePartial(script, ctx.parent)),
								]
							)
						);
					} else if (
						ctx.parent?.node.type === 'UpdateExpression' ||
						(ctx.parent?.node.type === 'AssignmentExpression' &&
							ctx.parentKey === 'left')
					) {
						lazy.replace(
							ctx.parent,
							b.callExpression(
								b.memberExpression(
									b.identifier(ACCESS_KEY),
									b.identifier('set2')
								),
								[
									ctx.node.object,
									property_argument,
									b.arrowFunctionExpression(
										[
											b.identifier(cTarget),
											b.identifier(cProp),
											b.identifier(cValue),
										],
										ctx.parent?.node.type === 'UpdateExpression'
											? b.updateExpression(
													ctx.parent.node.operator,
													b.memberExpression(
														b.identifier(cTarget),
														b.identifier(cProp),
														true
													),
													ctx.parent.node.prefix
											  )
											: b.assignmentExpression(
													ctx.parent.node.operator,
													b.memberExpression(
														b.identifier(cTarget),
														b.identifier(cProp),
														true
													),
													b.identifier(cValue)
											  )
									),
									ctx.parent?.node.type === 'UpdateExpression'
										? b.identifier('undefined')
										: ctx.parent.node.right,
									b.literal(generatePartial(script, ctx.parent)),
								]
							)
						);
					} else {
						lazy.replace(
							ctx,
							b.callExpression(
								b.memberExpression(
									b.identifier(ACCESS_KEY),
									b.identifier('get2')
								),
								[
									ctx.node.object,
									property_argument,
									b.literal(generatePartial(script, ctx)),
								]
							)
						);
					}
				}
				break;
		}
	}

	return lazy.toString(script);
}

export function restoreJS(script: string, url: StompURL) {
	url.codec;
	return script;
}
