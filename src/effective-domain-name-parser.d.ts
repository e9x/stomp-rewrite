declare module 'effective-domain-name-parser' {
	interface ParsedDomain {
		tld: string;
		sld: string;
		subdomain: string;
	}

	export function parse(name: string): ParsedDomain;
}
