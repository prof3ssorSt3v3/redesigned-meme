(() => {
  //when the page loads
  registerSW();
  //listen for changes to the hash value in the url
  window.addEventListener('hashchange', cardDisplayToggle);
  //listen for click events on the button and cards
  document.getElementById('usercards').addEventListener('click', handleCardClick);
  document.getElementById('btnShowAll').addEventListener('click', handleCardClick);
  //do the fetch
  getData();
})();

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      //service worker is installed
      navigator.serviceWorker.ready.then((reg) => {
        //the service worker is activated
        //add the message listener
        navigator.serviceWorker.addEventListener('message', receivedMessageFromSW);
      });
    });
  }
}

function getData() {
  //get the data once... which will be saved in the cache by the service worker
  let url = 'https://random-data-api.com/api/v2/users?size=8';
  fetch(url)
    .then((resp) => {
      if (!resp.ok) throw new Error('Failed to get user data...');
      return resp.json();
    })
    .then((users) => {
      let html = buildCards(users);
      document.getElementById('usercards').innerHTML = html;
      //now tell other tabs, if there are any, that a new tab is active
      //send a copy of the users data to compare to the cached version
      let msg = {
        users,
        action: 'compare',
      };
      sendMessageToSW(msg);
    })
    .catch((err) => {
      //tell the user about the error
      let html = `<p class="error">${err.message}</p>`;
      document.querySelector('header').innerHTML += html;
    });
}

function receivedMessageFromSW(ev) {
  //receive a message from the service worker
  let msg = ev.data;
  if ('uid' in msg) {
    nav(msg.uid);
  }
  if ('func' in msg) {
    eval(msg.func)();
  }
  if ('action' in msg && msg.action === 'newusers') {
    //update the list with the latest cached list of users
    //only happens each time a new window/tab is opened
    let html = buildCards(msg.users);
    document.getElementById('usercards').innerHTML = html;
  }
}

function sendMessageToSW(msg) {
  //send a message to the service worker
  navigator.serviceWorker.ready.then((reg) => {
    reg.active.postMessage(msg);
  });
}

function cardDisplayToggle(ev) {
  //called when popstate or hashchange happens
  let url = new URL(location.href);
  let uid = url.hash.replace('#', ''); //remove the # part
  if (uid) {
    //show one card
    let card = document.querySelector(`[data-ref="${uid}"]`);
    document.querySelectorAll('.card').forEach((c) => c.classList.add('hidden'));
    card?.classList.remove('hidden');
  } else {
    //show all cards
    document.querySelectorAll('.card').forEach((c) => c.classList.remove('hidden'));
  }
}

function nav(uid) {
  //called by clicking the button or card
  //uid could be null or an id
  //change the url hash value
  //trigger popstate or hashchange
  if (uid) {
    location.assign(`#${uid}`);
  } else {
    location.assign('#');
  }
}

function handleCardClick(ev) {
  let card = ev.target.closest('.card.user');
  let uid = null;
  if (card) {
    uid = card.getAttribute('data-ref');
    nav(uid);
  } else if (ev.target.id === 'btnShowAll') {
    nav(null);
  } else {
    return; //exit the function
  }
  sendMessageToSW({ uid, func: 'doStyleThing' });
}

function buildCards(users) {
  console.log('build cards starting with', users[0].first_name);
  return users
    .map((user) => {
      return `<li class="user card" data-ref="${user.uid}">
      <h2>${user.first_name + ' ' + user.last_name}</h2>
      <p>${user.email}</p>
    </li>`;
    })
    .join('');
  //skipping the image
}

function doStyleThing() {
  //function to be called when receiving a message
  document.querySelector('header h1').style.color = `#${Math.random().toString(16).substring(2, 8)}`;
}
