// Synthetic, browser-only harness. No authentication or backend certification.
const fs = require('node:fs');
const path = require('node:path');
const client = { id:'demo_client', name:'Cliente Demonstração', email:'client@example.test', role:'client', type:'client', accountStatus:'active' };
const professional = { id:'demo_professional', name:'Profissional Demonstração', email:'professional@example.test', role:'professional', type:'professional', accountStatus:'active' };
const service = { id:'demo_limpeza', title:'Limpeza residencial — demonstração', description:'Serviço fictício para demonstração local.', shortDescription:'Dados sintéticos. Nenhuma contratação real.', status:'active', moderationStatus:'published', professionalId:professional.id, providerId:professional.id, providerName:professional.name, category:'Limpeza', city:'Belo Horizonte', state:'MG', location:'Belo Horizonte, MG', priceLabel:'Sob orçamento', quoteMode:'default', images:[] };
async function setup(page) {
  // These repositories intentionally keep fixtures only in memory. The harness
  // carries synthetic snapshots across documents, without changing that policy.
  let conversations = [];
  await page.exposeFunction('demoRememberConversations', items => {
    conversations = items.map(item => {
      const snapshot = { ...item };
      // Store actor-neutral fixture data, as a backend response would. UI fields
      // computed for one persona must not be replayed for the other persona.
      for (const key of ['name', 'peerName', 'peerInitials', 'initials', 'avatarUrl']) delete snapshot[key];
      snapshot.messages = (item.messages || []).map(message => {
        const neutral = { ...message, mine: false };
        const sender = [client, professional].find(actor => actor.id === neutral.senderId);
        if (sender) {
          neutral.author = sender.name;
          neutral.authorInitials = sender === client ? 'CD' : 'PD';
        } else if (neutral.author === 'Você') delete neutral.author;
        return neutral;
      });
      return snapshot;
    });
  });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') return route.fulfill({body:'',contentType:route.request().resourceType()==='stylesheet'?'text/css':'application/javascript'});
    const seeds = {
      '/assets/js/repositories/services-repository.js': `Doke.repositories.services.save(${JSON.stringify(service)});`,
      '/assets/js/repositories/messages-repository.js': `Doke.repositories.messages.writeLocal(${JSON.stringify(conversations)});`
    };
    if (seeds[url.pathname]) {
      const source = fs.readFileSync(path.join(__dirname, '../..',url.pathname), 'utf8');
      return route.fulfill({contentType:'application/javascript',body:source+'\n'+seeds[url.pathname]});
    }
    return route.continue();
  });
  await page.addInitScript(user => {
    if (location.hostname !== '127.0.0.1') return;
    const actor = JSON.parse(localStorage.getItem('demo.actor') || 'null') || user;
    localStorage.setItem('doke.auth.session.v1', JSON.stringify({provider:'mock',sessionStatus:'active',accountStatus:'active',user:actor}));
    if (!localStorage.getItem('demo.initialized')) {
      localStorage.setItem('doke.defaultServiceLocation', JSON.stringify({titulo:'Casa demonstração',rua:'Rua Exemplo',numero:'10',bairro:'Centro',cidade:'Belo Horizonte',uf:'MG'}));
      localStorage.setItem('demo.initialized','1');
    }
    for (const name of ['doke:order-created','doke:order-status-changed','doke:message-sent']) {
      document.addEventListener(name, () => window.demoRememberConversations(window.Doke?.repositories?.messages?.readLocal() || []));
    }
  }, client);
}
async function switchActor(page, user, url) {
  await page.evaluate(user => localStorage.setItem('demo.actor', JSON.stringify(user)), user);
  await page.goto(url);
}
module.exports = { setup, switchActor, client, professional, service };
