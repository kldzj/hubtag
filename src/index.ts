import EventEmitter from 'events';
import fetch from 'cross-fetch';

const API_URL = 'https://hub.docker.com';

export interface TagWatcherOptions {
	/**
	 * Image name (e.g. `debian` or `containrrr/watchtower`)
	 */
	image: string;
	/**
	 * Tag name (e.g. `10` or `c0mm17h45h`)
	 */
	tag: string;
	/**
	 * Interval in ms, defaults to 60 seconds
	 */
	interval?: number;
}

export type TagWatcherEvents = {
	error: (e: Error) => void;
	push: (date: Date) => void;
	fetch: (result: any) => void;
};

interface ITagWatcher {
	isWatching: boolean;
	on<T extends keyof TagWatcherEvents>(evt: T, cb: TagWatcherEvents[T]): TagWatcher;
	off<T extends keyof TagWatcherEvents>(evt: T, cb: TagWatcherEvents[T]): TagWatcher;
	offAll<T extends keyof TagWatcherEvents>(evt?: T): TagWatcher;
	start(): TagWatcher;
	stop(): TagWatcher;
}

export class TagWatcher implements ITagWatcher {
	private image: string;
	private tag: string;
	private interval: number;
	private intervalId?: NodeJS.Timeout;
	private eventEmitter: EventEmitter = new EventEmitter();

	public get isWatching(): boolean {
		return this.intervalId !== undefined;
	}

	private get apiNamespace(): string {
		const parts = this.image.split('/');
		if (parts.length === 1 || parts[0] === '_') return 'library';
		return parts[0];
	}

	private get apiImageName(): string {
		return `${this.apiNamespace}/${this.image.split('/').pop()}`;
	}

	private get apiUrl(): string {
		return `${API_URL}/v2/repositories/${this.apiImageName}/tags/${this.tag}`;
	}

	constructor(opt: TagWatcherOptions) {
		this.image = opt.image;
		this.tag = opt.tag;
		this.interval = opt.interval ?? 60 * 1000;
	}

	public on<T extends keyof TagWatcherEvents>(evt: T, cb: TagWatcherEvents[T]) {
		this.eventEmitter.addListener(evt, cb);
		return this;
	}

	public off<T extends keyof TagWatcherEvents>(evt: T, cb: TagWatcherEvents[T]) {
		this.eventEmitter.removeListener(evt, cb);
		return this;
	}

	public offAll<T extends keyof TagWatcherEvents>(evt?: T) {
		this.eventEmitter.removeAllListeners(evt);
		return this;
	}

	public start() {
		if (this.isWatching) this.stop();
		const fetcher = this.createFetcher();
		this.intervalId = setInterval(fetcher, this.interval);
		fetcher();
		return this;
	}

	public stop() {
		if (!!this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
		}
		return this;
	}

	private emit<T extends keyof TagWatcherEvents>(evt: T, ...args: Parameters<TagWatcherEvents[T]>) {
		this.eventEmitter.listeners(evt).forEach((cb) => cb(...args));
	}

	private createFetcher() {
		let _lastPushed: Date;
		return async () => {
			try {
				const response = await fetch(this.apiUrl);
				if (!response.ok) {
					throw new Error(`Docker Hub API response is not OK: ${response.status}`);
				}

				const result = await response.json();
				if (!result.tag_last_pushed) {
					throw new Error(`Docker Hub API response does not include 'tag_last_pushed' key.`);
				}

				const lastPushed = new Date(result.tag_last_pushed);
				this.emit('fetch', result);
				if (!_lastPushed) _lastPushed = lastPushed;
				if (lastPushed > _lastPushed) {
					_lastPushed = lastPushed;
					this.emit('push', lastPushed);
				}
			} catch (e) {
				this.emit('error', e);
			}
		};
	}
}
