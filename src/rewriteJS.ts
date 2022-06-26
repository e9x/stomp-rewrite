import StompURL from './StompURL';
import { AcornContext, AcornIterator, result } from './acornUtil';
import { ACCESS_KEY } from './inject/baseModules/Access';
import { createDataURI, parseDataURI, routeURL } from './routeURL';
import { generate } from '@javascript-obfuscator/escodegen';
import { builders as b } from 'ast-types';
import { parse } from 'meriyah-loose';

// smaller range inside larger range = invalidates larger range
// smaller modifications called later in script

export const PROVIDERS = ['window', 'document'];
export const UNDEFINABLE = ['eval', 'location', 'top'];

export const CLIENT_KEY = '(stomp)';

const cTarget = 't$t';
const cProp = 't$p';
const cValue = 't$v';

function generatePartial(script: string, ctx: AcornContext) {
	let result = ctx.node.range
		? script.slice(ctx.node.range[0], ctx.node.range[1])
		: generate(ctx.node);

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
	const tree = parse(script, {
		module,
		next: true,
		specDeviation: true,
		ranges: true,
		globalReturn: true,
	});

	// const catchLoop = 0;

	for (const ctx of new AcornIterator(tree)) {
		/*if (catchLoop === 5000) {
			console.log('etc');
			console.log(generate(ctx.node), 'Over', catchLoop, 'iterations...');
			break;
		}

		catchLoop++;*/

		typeLoop: switch (ctx.node.type) {
			case 'ImportExpression':
				// todo: add tompc$.import(meta, url)
				ctx.replaceWith(
					b.importExpression(
						b.callExpression(
							b.memberExpression(
								b.memberExpression(
									b.identifier(ACCESS_KEY),
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
				ctx.replaceWith(
					b.importDeclaration(
						ctx.node.specifiers,
						b.literal(
							routeJS(
								new StompURL(
									new URL(ctx.node.source.value, url.toString()),
									url
								),
								url,
								true
							)
						)
					)
				);
				// TODO : FIX..?
				break;
			case 'CallExpression':
				{
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
						*/

						// transform eval(...) into eval(...tompc$.eval.eval_scope(eval, ...['code',{note:"eval is possibly a var"}]))
						ctx.replaceWith(
							b.callExpression(b.identifier('eval'), [
								b.spreadElement(
									b.callExpression(
										b.memberExpression(
											b.identifier(ACCESS_KEY),
											b.identifier('evalScope')
										),
										[
											b.identifier('eval'),
											...ctx.node.arguments.map((arg: any) => result(arg)),
										]
									)
								),
							])
						);
					}
				}
				break;
			case 'Identifier':
				{
					switch (ctx.parent?.node.type) {
						case 'ArrayPattern':
						case 'ObjectPattern':
						case 'LabeledStatement':
						case 'MethodDefinition':
						case 'ClassDeclaration':
						case 'RestElement':
						case 'ExportSpecifier':
						case 'ImportSpecifier':
							break typeLoop;
						case 'MemberExpression':
							if (ctx.parentKey === 'property') break typeLoop;
							break;
						case 'VariableDeclarator':
							if (ctx.parentKey === 'id') break typeLoop;
							break;
						case 'Property':
							if (ctx.parentKey === 'key') break typeLoop;
							break;
						case 'FunctionDeclaration':
						case 'FunctionExpression':
							if (ctx.parentKey === 'id') break typeLoop;
						// fallthrough
						case 'ArrowFunctionExpression':
							if (ctx.parentKey === 'params') break typeLoop;
							break;
						case 'AssignmentPattern':
							if (ctx.parentKey === 'left') break typeLoop;
							break;
					}
					if (!UNDEFINABLE.includes(ctx.node.name)) break;

					if (
						ctx.parent?.node.type === 'UpdateExpression' ||
						(ctx.parent?.node.type === 'AssignmentExpression' &&
							ctx.parentKey === 'left')
					) {
						ctx.parent.replaceWith(
							b.callExpression(
								b.memberExpression(
									b.identifier(ACCESS_KEY),
									b.identifier('set1')
								),
								[
									ctx.node,
									b.literal(ctx.node.name),
									// return what the intended value is
									b.arrowFunctionExpression(
										[
											b.identifier(cTarget),
											b.identifier(cProp),
											b.identifier(cValue),
										],
										ctx.parent.node!.type === 'UpdateExpression'
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
									// set
									b.arrowFunctionExpression(
										[b.identifier(cValue)],
										b.assignmentExpression('=', ctx.node, b.identifier(cValue))
									),
									ctx.parent!.node.type === 'UpdateExpression'
										? b.identifier('undefined')
										: ctx.parent.node.right,
									b.literal(generatePartial(script, ctx.parent)),
								]
							)
						);
					} else {
						ctx.replaceWith(
							b.callExpression(
								b.memberExpression(
									b.identifier(ACCESS_KEY),
									b.identifier('get')
								),
								[ctx.node, b.literal(ctx.node.name)]
							)
						);
					}
				}
				break;
			case 'MemberExpression':
				{
					switch (ctx.parent?.node.type) {
						case 'ArrayPattern':
						case 'ObjectPattern':
							break typeLoop;
						case 'UnaryExpression':
							if (ctx.parent?.node.operator === 'delete') break typeLoop;
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

					let propertyArgument;

					// TODO: run property_argument through rewriter
					// object[location[location]]
					if (ctx.node.computed) {
						propertyArgument = result(ctx.node.property);
					} else if (ctx.node.property.type === 'Identifier') {
						propertyArgument = b.literal(ctx.node.property.name);
					}

					if (
						ctx.parent?.node.type === 'NewExpression' &&
						ctx.parentKey === 'callee'
					) {
						ctx.parent!.replaceWith(
							b.callExpression(
								b.memberExpression(
									b.identifier(ACCESS_KEY),
									b.identifier('new2')
								),
								[
									result(ctx.node.object),
									propertyArgument,
									result(b.arrayExpression(ctx.parent!.node.arguments)),
									b.literal(generatePartial(script, ctx.parent!)),
								]
							)
						);
					} else if (
						ctx.parent?.node.type === 'CallExpression' &&
						ctx.parentKey === 'callee'
					) {
						ctx.parent!.replaceWith(
							b.callExpression(
								b.memberExpression(
									b.identifier(ACCESS_KEY),
									b.identifier('call2')
								),
								[
									result(ctx.node.object),
									propertyArgument,
									result(b.arrayExpression(ctx.parent!.node.arguments)),
									b.literal(generatePartial(script, ctx.parent!)),
								]
							)
						);
					} else if (
						ctx.parent?.node.type === 'UpdateExpression' ||
						(ctx.parent?.node.type === 'AssignmentExpression' &&
							ctx.parentKey === 'left')
					) {
						ctx.parent!.replaceWith(
							b.callExpression(
								b.memberExpression(
									b.identifier(ACCESS_KEY),
									b.identifier('set2')
								),
								[
									ctx.node.object,
									propertyArgument,
									b.arrowFunctionExpression(
										[
											b.identifier(cTarget),
											b.identifier(cProp),
											b.identifier(cValue),
										],
										ctx.parent?.node.type === 'UpdateExpression'
											? b.updateExpression(
													ctx.parent!.node.operator,
													b.memberExpression(
														b.identifier(cTarget),
														b.identifier(cProp),
														true
													),
													ctx.parent!.node.prefix
											  )
											: b.assignmentExpression(
													ctx.parent!.node.operator,
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
										: ctx.parent!.node.right,
									b.literal(generatePartial(script, ctx.parent!)),
								]
							)
						);
					} else {
						ctx.replaceWith(
							b.callExpression(
								b.memberExpression(
									b.identifier(ACCESS_KEY),
									b.identifier('get2')
								),
								[
									result(ctx.node.object),
									propertyArgument,
									b.literal(generatePartial(script, ctx)),
								]
							)
						);
					}
				}
				break;
		}
	}

	return generate(tree);
}

export function restoreJS(script: string, url: StompURL) {
	url.codec;
	return script;
}
