// Adapted from https://github.com/yjs/yjs#example-using-and-combining-providers
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';

const ydoc = new Y.Doc();

const indexeddbProvider = new IndexeddbPersistence('count-demo', ydoc);
indexeddbProvider.whenSynced.then(() => {
  console.log('loaded data from indexed db');
});

const websocketProvider = new WebsocketProvider(
  'ws://localhost:1234',
  'count-demo',
  ydoc
);

const yarray = ydoc.getArray('count');

yarray.observe(event => {
  console.log('new sum: ' + yarray.toArray().reduce((a, b) => a + b));
});

yarray.push([1]);
