# hubtag

Emit events on Docker Hub image tag changes (currently limited to handle push events).

## Example Usage

```ts
import { TagWatcher } from 'hubtag';

new TagWatcher({ image: 'debian', tag: '10' })
	.on('push', (date) => console.log('image tag was updated', date))
	.on('error', (e) => console.error(e))
	.start();
```

## Configuration

```ts
interface TagWatcherOptions {
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
```

## Events

### `error` -> <small>`(e: Error) => void`</small>

Emits fetcher errors.

### `push` -> <small>`(date: Date) => void`</small>

Emits push events, the `date` parameter is the last pushed timestamp.

### `fetch` -> <small>`(result: any) => void`</small>

Emits successful fetches, the `result` parameter contains the parsed JSON response.

## TagWatcher interface

```ts
interface ITagWatcher {
	isWatching: boolean;
	on<T extends keyof TagWatcherEvents>(evt: T, cb: TagWatcherEvents[T]): TagWatcher;
	off<T extends keyof TagWatcherEvents>(evt: T, cb: TagWatcherEvents[T]): TagWatcher;
	offAll<T extends keyof TagWatcherEvents>(evt?: T): TagWatcher;
	start(): TagWatcher;
	stop(): TagWatcher;
}
```
