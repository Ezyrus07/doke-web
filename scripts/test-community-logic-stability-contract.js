const fs = require('fs');
const assert = require('assert');
const root = process.cwd();
const bridge = fs.readFileSync(`${root}/assets/js/features/browser-notification-bridge.js`, 'utf8');
const runtime = fs.readFileSync(`${root}/assets/js/features/community-runtime-stability.js`, 'utf8');
['Notification.requestPermission','document.visibilityState','DokeBrowserNotifications'].forEach((token)=>assert(bridge.includes(token), `missing ${token}`));
['navigator.onLine','doke:connection-state','MutationObserver','Escape','DokeCommunityRuntime'].forEach((token)=>assert(runtime.includes(token), `missing ${token}`));
['comunidade-interna.html','mensagens.html','notificacoes.html'].forEach((file)=>{const html=fs.readFileSync(`${root}/${file}`,'utf8');assert(html.includes('browser-notification-bridge.js'));assert(html.includes('community-runtime-stability.js'));assert(html.includes('community-runtime-stability.css'));});
console.log('Community logic stability contract: OK');
