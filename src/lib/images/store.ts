/**
 * Local photo storage.
 *
 * IndexedDB rather than localStorage because a handful of 900px data URLs will
 * blow through the 5 MB localStorage ceiling immediately.
 */

const DB_NAME = 'unwind-photos';
const STORE = 'photos';
const VERSION = 1;

export interface StoredPhoto {
	id: string;
	title: string;
	dataUrl: string;
	added: number;
}

let db: IDBDatabase | null = null;

function open(): Promise<IDBDatabase> {
	if (db) return Promise.resolve(db);
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, VERSION);
		request.onupgradeneeded = () => {
			const database = request.result;
			if (!database.objectStoreNames.contains(STORE)) {
				database.createObjectStore(STORE, { keyPath: 'id' });
			}
		};
		request.onsuccess = () => {
			db = request.result;
			resolve(db);
		};
		request.onerror = () => reject(request.error);
	});
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
	return open().then(
		(database) =>
			new Promise<T>((resolve, reject) => {
				const transaction = database.transaction(STORE, mode);
				const request = run(transaction.objectStore(STORE));
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			})
	);
}

export async function listPhotos(): Promise<StoredPhoto[]> {
	try {
		const all = await tx<StoredPhoto[]>('readonly', (store) => store.getAll());
		return all.sort((a, b) => b.added - a.added);
	} catch {
		// Private browsing can deny IndexedDB outright. The game still works,
		// it just cannot remember photos between visits.
		return [];
	}
}

export async function savePhoto(title: string, dataUrl: string): Promise<StoredPhoto> {
	const photo: StoredPhoto = {
		id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		title,
		dataUrl,
		added: Date.now()
	};
	await tx('readwrite', (store) => store.put(photo));
	return photo;
}

export async function deletePhoto(id: string): Promise<void> {
	await tx('readwrite', (store) => store.delete(id));
}

export async function getPhoto(id: string): Promise<StoredPhoto | undefined> {
	try {
		return await tx<StoredPhoto | undefined>('readonly', (store) => store.get(id));
	} catch {
		return undefined;
	}
}
