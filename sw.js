const version = 1;
const cacheName = `energetic-octopus-cache-${version}`;

self.addEventListener('activate', (ev) => {
  console.log('activated');
});

self.addEventListener('fetch', (ev) => {
  //main.js sent an HTTP request
  let url = new URL(ev.request.url);
  console.log('requesting', url.pathname);
  if (url.hostname.includes('random-data-api.com')) {
    ev.respondWith(
      caches.match('users.json').then((cacheResp) => {
        return (
          cacheResp ||
          fetch(ev.request).then((fetchResp) => {
            return caches.open(cacheName).then((cache) => {
              return cache.put('users.json', fetchResp.clone()).then(() => {
                //tell other tabs that users is updated
                //fetch event has a clientId property
                return fetchResp;
              });
            });
          })
        );
      })
    );
  } else {
    ev.respondWith(fetch(ev.request));
  }
});

self.addEventListener('message', (ev) => {
  //main.js sent a message
  let clientid = ev.source.id;
  let msg = ev.data;
  if ('uid' in msg && 'func' in msg) {
    sendMessageToWindow(msg, clientid);
  }
  if ('action' in msg && msg.action === 'compare') {
    //this runs each time a new window/tab is opened
    ev.waitUntil(
      caches
        .open(cacheName)
        .then((cache) => {
          return cache.match('users.json');
        })
        .then((resp) => {
          if (!resp.ok) throw new Error('nothing in cache');
          return resp.json();
        })
        .then((userdata) => {
          console.log('tell other tabs about newusers in cache');
          //send it to the other users
          sendMessageToWindow({ action: 'newusers', users: userdata }, clientid);
        })
        .catch((err) => {
          //nothing in cache... do nothing
        })
    );
  }
});

function sendMessageToWindow(msg, clientid) {
  clients.matchAll({ includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => {
      if (client.id !== clientid) {
        //send the message to all the other tabs
        client.postMessage(msg);
      } else {
        //message to the tab that matches the clientid
      }
    });
  });
}
