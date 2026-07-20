(function () {
  'use strict';
  var Doke = window.Doke || (window.Doke = {});
  var root = null;
  var current = null;
  var activeAction = '';
  var decisionBusy = false;
  var initializedRoot = null;
  var REVIEW_TIMEOUT_MS = 9000;

  function q(selector) { return document.querySelector(selector); }
  function clean(value) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim(); }
  function repository() { return Doke.repositories && Doke.repositories.serviceModeration || null; }
  function accessService() { return Doke.services && Doke.services.adminAccess || null; }
  function lifecycle() { return window.DokeNavigationLifecycle || Doke.navigationLifecycle || null; }
  function withTimeout(operation, timeoutMs, message) {
    var timer = null;
    return Promise.race([Promise.resolve(operation), new Promise(function (_, reject) { timer = window.setTimeout(function () { reject(new Error(message)); }, timeoutMs); })]).finally(function () { if (timer) window.clearTimeout(timer); });
  }
  function showToast(message) {
    var toast = q('[data-admin-ad-review-toast]'); if (!toast) return;
    toast.textContent = clean(message); toast.hidden = false;
    window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(function () { toast.hidden = true; }, 3600);
  }
  function formatDate(value) {
    var date = value ? new Date(value) : null;
    return !date || Number.isNaN(date.getTime()) ? 'Não informado' : date.toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function sourceLabel(value) {
    var key = clean(value).toLowerCase();
    if (key === 'create') return 'Novo anúncio';
    if (key === 'resubmit') return 'Reenvio após ajustes';
    return 'Alteração de anúncio';
  }
  function changeClassLabel(value) {
    var key = clean(value).toLowerCase();
    if (key === 'critical') return 'Alteração crítica';
    if (key === 'minor') return 'Alteração menor';
    return 'Alteração relevante';
  }
  function quoteModeLabel(snapshot) {
    var mode = clean(snapshot && snapshot.quoteMode).toLowerCase();
    if (mode === 'custom') return 'Formulário personalizado';
    if (mode === 'disabled') return 'Somente conversa';
    return 'Modelo Doke';
  }
  function appendText(parent, tag, className, value) {
    var node = document.createElement(tag); if (className) node.className = className;
    node.textContent = clean(value); parent.appendChild(node); return node;
  }
  function setSurface(state, message) {
    var busy = state === 'guard-pending' || state === 'loading';
    root.dataset.viewState = state; root.setAttribute('aria-busy', busy ? 'true' : 'false');
    var pending = q('[data-admin-ad-review-pending]'); var content = q('[data-admin-ad-review-content]'); var error = q('[data-admin-ad-review-error]');
    if (pending) pending.hidden = !busy; if (content) content.hidden = state !== 'ready'; if (error) error.hidden = state !== 'error';
    if (state === 'loading') { q('[data-admin-ad-review-pending-title]').textContent = 'Carregando comparação'; q('[data-admin-ad-review-pending-message]').textContent = 'Buscando a versão pública e a versão enviada.'; }
    if (error && message) q('[data-admin-ad-review-error-message]').textContent = message;
    if (state === 'error' && error) window.requestAnimationFrame(function () { error.focus(); });
  }
  function beginPage() { var api = lifecycle(); if (api && api.page) api.page.begin({ page: 'admin-anuncio-revisao', source: 'admin-ad-review-controller' }); }
  function readyPage() { var api = lifecycle(); if (api && api.page) api.page.ready({ page: 'admin-anuncio-revisao', source: 'admin-ad-review-controller', hasItems: true }); }
  function failPage(error) { var api = lifecycle(); if (api && api.page) api.page.fail(error, { page: 'admin-anuncio-revisao', source: 'admin-ad-review-controller' }); }
  function goBack(replace) {
    var target = 'admin.html';
    if (typeof window.DokeNavigate === 'function') return Promise.resolve(window.DokeNavigate(target, { source: 'admin-ad-review-back', replace: replace === true }));
    if (replace) window.location.replace(target); else window.location.assign(target); return Promise.resolve();
  }
  function normalizedValue(snapshot, key) {
    var value = snapshot && snapshot[key];
    if (key === 'quoteMode') return quoteModeLabel(snapshot);
    if (key === 'price') return clean(snapshot && (snapshot.priceLabel || snapshot.priceValue)) || 'Sob orçamento';
    if (key === 'description') return clean(snapshot && (snapshot.description || snapshot.fullDescription)) || 'Não informado';
    if (key === 'images') return Array.isArray(value) ? String(value.length) + ' imagem(ns)' : '0 imagens';
    if (key === 'quoteTemplate') { var questions = value && Array.isArray(value.questions) ? value.questions : []; return questions.length ? String(questions.length) + ' pergunta(s)' : 'Sem perguntas personalizadas'; }
    if (Array.isArray(value)) return value.length ? value.join(', ') : 'Não informado';
    if (value && typeof value === 'object') return JSON.stringify(value);
    return clean(value) || 'Não informado';
  }
  function valuesEqual(a, b) { return clean(a) === clean(b); }
  function comparisonRow(label, key, approved, pending) {
    var beforeValue = normalizedValue(approved, key); var afterValue = normalizedValue(pending, key); var changed = !valuesEqual(beforeValue, afterValue);
    var row = document.createElement('article'); row.className = 'admin-ad-review__row'; row.dataset.changed = changed ? 'true' : 'false';
    appendText(row, 'h3', 'admin-ad-review__field-title', label);
    var columns = document.createElement('div'); columns.className = 'admin-ad-review__columns';
    var before = document.createElement('div'); before.className = 'admin-ad-review__value'; appendText(before, 'span', '', approved ? 'Versão pública' : 'Sem versão pública'); appendText(before, 'p', '', approved ? beforeValue : 'Novo anúncio');
    var after = document.createElement('div'); after.className = 'admin-ad-review__value admin-ad-review__value--new'; appendText(after, 'span', '', changed ? 'Nova versão · alterado' : 'Nova versão · sem alteração'); appendText(after, 'p', '', afterValue);
    columns.append(before, after); row.appendChild(columns); return row;
  }
  var sections = [
    { id: 'review-basic', eyebrow: 'Conteúdo principal', title: 'Identificação do serviço', fields: [['Título','title'],['Categoria','category'],['Descrição curta','shortDescription'],['Descrição completa','description']] },
    { id: 'review-offer', eyebrow: 'Oferta comercial', title: 'Preço e atendimento', fields: [['Preço','price'],['Modalidade','serviceMode'],['Cidade','city'],['Estado','state'],['Área de atendimento','serviceArea'],['Disponibilidade','availability']] },
    { id: 'review-scope', eyebrow: 'Escopo', title: 'Inclusões e diferenciais', fields: [['Itens incluídos','includedItems'],['Diferenciais','differentials']] },
    { id: 'review-quote', eyebrow: 'Conversão', title: 'Formulário de orçamento', fields: [['Modo de orçamento','quoteMode'],['Perguntas personalizadas','quoteTemplate']] }
  ];
  function createSection(config, approved, pending) {
    var section = document.createElement('section'); section.className = 'admin-ad-review__section'; section.id = config.id;
    var header = document.createElement('header'); header.className = 'admin-ad-review__section-header'; var copy = document.createElement('div'); appendText(copy,'span','',config.eyebrow); appendText(copy,'h2','',config.title);
    var rows = document.createElement('div'); rows.className = 'admin-ad-review__rows'; var changedCount = 0;
    config.fields.forEach(function (field) { var row = comparisonRow(field[0], field[1], approved, pending); if (row.dataset.changed === 'true') changedCount += 1; rows.appendChild(row); });
    appendText(header,'strong','admin-ad-review__section-count',changedCount + ' alteração(ões)'); header.prepend(copy); section.append(header, rows); section.dataset.changedCount = String(changedCount); return section;
  }
  function imageSection(approved, pending) {
    var section = document.createElement('section'); section.className = 'admin-ad-review__section'; section.id = 'review-images';
    var oldImages = approved && Array.isArray(approved.images) ? approved.images : []; var newImages = pending && Array.isArray(pending.images) ? pending.images : [];
    var changed = JSON.stringify(oldImages) !== JSON.stringify(newImages); section.dataset.changedCount = changed ? '1' : '0';
    var header = document.createElement('header'); header.className = 'admin-ad-review__section-header'; var copy = document.createElement('div'); appendText(copy,'span','','Mídia'); appendText(copy,'h2','','Imagens do anúncio'); appendText(header,'strong','admin-ad-review__section-count',changed ? 'Alterado' : 'Sem alteração'); header.prepend(copy); section.appendChild(header);
    var columns = document.createElement('div'); columns.className = 'admin-ad-review__media-columns';
    [{label: approved ? 'Versão pública' : 'Sem versão pública', images: oldImages},{label:'Nova versão',images:newImages}].forEach(function (group) {
      var block = document.createElement('div'); block.className = 'admin-ad-review__media-group'; appendText(block,'strong','',group.label); var grid = document.createElement('div'); grid.className = 'admin-ad-review__media-grid';
      if (!group.images.length) appendText(grid,'span','admin-ad-review__empty-copy','Nenhuma imagem');
      group.images.slice(0,3).forEach(function (url,index) { var figure=document.createElement('figure'); var img=document.createElement('img'); img.src=clean(url); img.alt=group.label+' — imagem '+(index+1); img.loading='lazy'; figure.appendChild(img); appendText(figure,'figcaption','',index===0?'Principal':'Extra '+index); grid.appendChild(figure); });
      block.appendChild(grid); columns.appendChild(block);
    }); section.appendChild(columns); return section;
  }
  function questionGroup(snapshot,label) {
    var block=document.createElement('div'); block.className='admin-ad-review__question-group'; appendText(block,'strong','',label); var questions=snapshot&&snapshot.quoteTemplate&&Array.isArray(snapshot.quoteTemplate.questions)?snapshot.quoteTemplate.questions:[];
    if(!questions.length){appendText(block,'p','admin-ad-review__empty-copy','Sem perguntas personalizadas.');return block;}
    var list=document.createElement('ol'); questions.forEach(function(question){var item=document.createElement('li');appendText(item,'span','',question&&question.label||'Pergunta sem título');appendText(item,'small','',clean(question&&question.type)+(question&&question.required?' · obrigatória':' · opcional'));list.appendChild(item);});block.appendChild(list);return block;
  }
  function questionSection(approved,pending) {
    var oldQuestions=approved&&approved.quoteTemplate&&Array.isArray(approved.quoteTemplate.questions)?approved.quoteTemplate.questions:[]; var newQuestions=pending&&pending.quoteTemplate&&Array.isArray(pending.quoteTemplate.questions)?pending.quoteTemplate.questions:[];
    var section=document.createElement('section');section.className='admin-ad-review__section';section.id='review-questions';var changed=JSON.stringify(oldQuestions)!==JSON.stringify(newQuestions);section.dataset.changedCount=changed?'1':'0';
    var header=document.createElement('header');header.className='admin-ad-review__section-header';var copy=document.createElement('div');appendText(copy,'span','','Diagnóstico');appendText(copy,'h2','','Perguntas do orçamento');appendText(header,'strong','admin-ad-review__section-count',changed?'Alterado':'Sem alteração');header.prepend(copy);section.appendChild(header);
    var columns=document.createElement('div');columns.className='admin-ad-review__question-columns';columns.append(questionGroup(approved,approved?'Versão pública':'Sem versão pública'),questionGroup(pending,'Nova versão'));section.appendChild(columns);return section;
  }
  function identityItem(label,value){var item=document.createElement('div');item.className='admin-ad-review__identity-item';appendText(item,'span','',label);appendText(item,'strong','',value||'Não informado');return item;}
  function summaryRow(label,value){return '<div><dt>'+label+'</dt><dd>'+clean(value)+'</dd></div>';}
  function render(item) {
    current=item; var pending=item.snapshot||{}; var approved=item.approvedSnapshot&&Object.keys(item.approvedSnapshot).length?item.approvedSnapshot:null;
    q('[data-admin-ad-review-eyebrow]').textContent=sourceLabel(item.source)+' · versão '+clean(item.versionNumber); q('[data-admin-ad-review-title]').textContent=pending.title||'Anúncio sem título'; q('[data-admin-ad-review-description]').textContent='Compare cada alteração com a versão pública antes de tomar uma decisão.';
    var status=q('[data-admin-ad-review-status]');status.replaceChildren();var badge=appendText(status,'span','admin-ad-review__status-badge',changeClassLabel(item.changeClass));badge.dataset.tone=clean(item.changeClass)||'major';appendText(status,'small','','Enviado em '+formatDate(item.submittedAt));
    var identity=q('[data-admin-ad-review-identity]');identity.replaceChildren(identityItem('Profissional',item.professionalName||'Profissional Doke'),identityItem('E-mail',item.professionalEmail||'Não informado'),identityItem('Versões',approved?'Pública '+clean(item.approvedVersionNumber||'')+' → enviada '+clean(item.versionNumber):'Primeira versão'));
    var main=q('[data-admin-ad-review-main]');main.replaceChildren();var totalChanged=0;var nav=q('[data-admin-ad-review-nav]');nav.replaceChildren();
    sections.forEach(function(config){var section=createSection(config,approved,pending);totalChanged+=Number(section.dataset.changedCount||0);main.appendChild(section);var link=document.createElement('a');link.className='admin-ad-review__section-link';link.href='#'+config.id;link.textContent=config.title;nav.appendChild(link);});
    var media=imageSection(approved,pending);totalChanged+=Number(media.dataset.changedCount||0);main.appendChild(media);var mediaLink=document.createElement('a');mediaLink.className='admin-ad-review__section-link';mediaLink.href='#review-images';mediaLink.textContent='Imagens';nav.appendChild(mediaLink);
    var questions=questionSection(approved,pending);totalChanged+=Number(questions.dataset.changedCount||0);main.appendChild(questions);var qLink=document.createElement('a');qLink.className='admin-ad-review__section-link';qLink.href='#review-questions';qLink.textContent='Perguntas';nav.appendChild(qLink);
    q('[data-admin-ad-review-summary]').innerHTML=[summaryRow('Classificação',changeClassLabel(item.changeClass)),summaryRow('Campos alterados',String(totalChanged)),summaryRow('Versão enviada',String(item.versionNumber||'1')),summaryRow('Versão pública',approved?String(item.approvedVersionNumber||'Aprovada'):'Nenhuma'),summaryRow('Envio',formatDate(item.submittedAt))].join('');
    applyChangedFilter(true);setSurface('ready');readyPage();
  }
  function applyChangedFilter(changedOnly){document.querySelectorAll('.admin-ad-review__section').forEach(function(section){var visibleRows=0;section.querySelectorAll('.admin-ad-review__row').forEach(function(row){var hide=changedOnly&&row.dataset.changed!=='true';row.hidden=hide;if(!hide)visibleRows+=1;});var structural=section.id==='review-images'||section.id==='review-questions';section.hidden=changedOnly&&(structural?Number(section.dataset.changedCount||0)===0:visibleRows===0);});}
  function setDecisionBusy(busy){decisionBusy=busy;var actions=q('[data-admin-ad-review-actions]');if(actions)actions.setAttribute('aria-busy',busy?'true':'false');document.querySelectorAll('[data-admin-ad-review-action], [data-admin-ad-review-dialog-submit], [data-admin-ad-review-dialog-close]').forEach(function(button){button.disabled=busy;});}
  function closeDialog(){var dialog=q('[data-admin-ad-review-dialog]');if(dialog&&dialog.open)dialog.close();activeAction='';var input=q('[data-admin-ad-review-reason]');if(input)input.value='';}
  function openReasonDialog(action){activeAction=action;var changes=action==='changes';q('[data-admin-ad-review-dialog-title]').textContent=changes?'Solicitar ajustes':'Rejeitar versão';q('[data-admin-ad-review-dialog-description]').textContent=changes?'Explique o que o profissional precisa corrigir antes de reenviar.':'Informe por que esta versão não pode ser aprovada.';var submit=q('[data-admin-ad-review-dialog-submit]');submit.textContent=changes?'Enviar solicitação':'Confirmar rejeição';submit.className='doke-btn '+(changes?'doke-btn--primary':'doke-btn--danger');var dialog=q('[data-admin-ad-review-dialog]');if(dialog&&typeof dialog.showModal==='function')dialog.showModal();window.requestAnimationFrame(function(){q('[data-admin-ad-review-reason]').focus();});}
  function resolve(action,reason){if(decisionBusy||!current)return Promise.resolve();var repo=repository();if(!repo)return Promise.reject(new Error('A autoridade de moderação não está disponível.'));var operation=action==='approve'?repo.approve(current.versionId):action==='changes'?repo.requestChanges(current.versionId,reason):repo.reject(current.versionId,reason);setDecisionBusy(true);return Promise.resolve(operation).then(function(){closeDialog();showToast(action==='approve'?'Anúncio aprovado e publicado.':action==='changes'?'Ajustes solicitados ao profissional.':'Versão rejeitada.');return new Promise(function(done){window.setTimeout(done,260);});}).then(function(){return goBack(true);}).catch(function(error){setDecisionBusy(false);showToast(error&&error.message||'Não foi possível concluir a análise.');});}
  function load(){setSurface('guard-pending');beginPage();var access=accessService();if(!access||typeof access.guardPage!=='function')return Promise.reject(new Error('O serviço de acesso administrativo não está disponível.'));return withTimeout(access.guardPage({name:'admin-ad-review-access',source:'admin-anuncio-revisao.html',deniedRedirect:'pedidos.html',loginRedirect:'auth/login.html'}),REVIEW_TIMEOUT_MS,'A validação de acesso demorou mais do que o esperado.').then(function(result){if(!result||result.allowed!==true)throw new Error('Acesso restrito ao suporte Doke.');setSurface('loading');var versionId=new URLSearchParams(window.location.search).get('version') || clean(root && root.dataset.versionId);var repo=repository();if(!versionId)throw new Error('A versão para análise não foi informada.');if(!repo||typeof repo.getReviewDetail!=='function')throw new Error('O repositório de moderação não está disponível.');return withTimeout(repo.getReviewDetail(versionId),REVIEW_TIMEOUT_MS,'O carregamento da comparação demorou mais do que o esperado.');}).then(function(item){if(!item)throw new Error('Esta versão não está mais aguardando análise.');render(item);return item;}).catch(function(error){console.error('[Doke][admin-anuncio-revisao]',error);setSurface('error',error&&error.message||'Não foi possível carregar esta análise.');failPage(error);return null;});}
  function bind(){document.addEventListener('click',function(event){if(event.target.closest('[data-admin-ad-review-back]')){event.preventDefault();goBack(false);return;}if(event.target.closest('[data-admin-ad-review-retry]')){event.preventDefault();load();return;}var action=event.target.closest('[data-admin-ad-review-action]');if(action){event.preventDefault();var name=clean(action.dataset.adminAdReviewAction);if(name==='approve'){if(window.confirm('Aprovar esta versão e publicá-la?'))resolve('approve');}else openReasonDialog(name);return;}if(event.target.closest('[data-admin-ad-review-dialog-close]')){event.preventDefault();closeDialog();return;}if(event.target.closest('[data-admin-ad-review-dialog-submit]')){event.preventDefault();var reason=clean(q('[data-admin-ad-review-reason]').value);if(reason.length<10){showToast('Informe um motivo com pelo menos 10 caracteres.');q('[data-admin-ad-review-reason]').focus();return;}resolve(activeAction,reason);}});var filter=q('[data-admin-ad-review-changed-only]');if(filter)filter.addEventListener('change',function(){applyChangedFilter(filter.checked);});}
  function init(){var activeRoot=q('[data-admin-ad-review-root]');if(!activeRoot)return Promise.resolve(null);if(initializedRoot===activeRoot)return Promise.resolve(current);initializedRoot=activeRoot;root=activeRoot;bind();return load();}
  window.DokeInitAdminAdReview=init;
  function bootstrap(){Promise.resolve(init()).catch(function(error){console.error('[Doke][admin-anuncio-revisao] Falha na inicialização',error);});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootstrap,{once:true});else bootstrap();
}());
