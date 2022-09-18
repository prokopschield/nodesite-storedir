export type File_Short = {
	name: string;
	type: 'file';
	size: number;
	hash: string;
};

export type File_Long = {
	name: string;
	type: 'longfile';
	size: number;
	parts: string[];
};

export type Directory = {
	name: string;
	type: 'directory';
	children: Array<string>;
};
