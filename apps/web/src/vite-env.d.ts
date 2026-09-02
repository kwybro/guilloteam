/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_GUILLOTEAM_USER_ID: string;
	readonly VITE_GUILLOTEAM_USER_TOKEN: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
