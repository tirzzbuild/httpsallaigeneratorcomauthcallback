(function(){
  /* ---------- data ---------- */
  var START_CREDITS = 8500;
  var WHITELIST = []; // kosong = semua email diterima di mode demo. Isi dengan email/team ID yang diizinkan.

  var IMG_MODELS = [
    {id:'chatgpt', name:'ChatGPT Images', desc:'Realistis, edit foto, desain dari prompt', cost:120},
    {id:'midjourney', name:'Midjourney', desc:'Anime, fantasy, cinematic, artwork', cost:150, off:'Belum ada API resmi'},
    {id:'nano', name:'Nano Banana', desc:'Edit foto, karakter dan objek tetap konsisten', cost:80, ref:true},
    {id:'flux', name:'FLUX', desc:'Fotorealistik, detail tinggi', cost:60},
    {id:'ideogram', name:'Ideogram', desc:'Poster, logo, gambar dengan tulisan', cost:90},
    {id:'leonardo', name:'Leonardo AI', desc:'Karakter, game, concept art', cost:70},
    {id:'firefly', name:'Adobe Firefly', desc:'Desain dan kebutuhan komersial', cost:100}
  ];
  var VID_MODELS = [
    {id:'veo', name:'Google Veo 3.1', desc:'Video realistis dengan suara dan dialog', mult:2.0, native:8},
    {id:'kling', name:'Kling 3.0', desc:'Cinematic, karakter bergerak', mult:1.4, native:10},
    {id:'runway', name:'Runway Gen-4.5', desc:'Film, iklan, editing profesional', mult:1.8, native:10},
    {id:'seedance', name:'Seedance', desc:'Adegan panjang dan multi-shot', mult:1.2, native:10},
    {id:'pika', name:'Pika', desc:'Video pendek dan efek kreatif', mult:0.8, native:5},
    {id:'heygen', name:'HeyGen', desc:'Avatar dan orang berbicara', mult:1.5, native:15},
    {id:'luma', name:'Luma', desc:'Cinematic dan gerakan kamera', mult:1.3, native:9}
  ];
  var DURATIONS = {5:500, 8:800, 12:1200, 15:1500};
  var PURPOSES = [
    {k:'Poster atau teks', m:'ideogram'},
    {k:'Foto realistis', m:'flux'},
    {k:'Anime atau fantasi', m:'leonardo'},
    {k:'Edit foto', m:'nano'},
    {k:'Desain komersial', m:'firefly'},
    {k:'Gambar serbaguna', m:'chatgpt'}
  ];
  var RATIOS = {'1:1':[400,400],'9:16':[225,400],'16:9':[400,225]};

  /* ---------- state ---------- */
  var S = {user:null, credits:START_CREDITS, history:[], tab:'image', favOnly:false,
    img:{model:'chatgpt', prompt:'', ratio:'1:1', n:1, ref:'', purpose:''},
    vid:{model:'veo', prompt:'', dur:5, ratio:'16:9'}};
  var jobs = [];

  function load(){
    try{
      var raw = localStorage.getItem('allai_v1');
      if(raw){ var d = JSON.parse(raw); S.user=d.user||null; S.credits=typeof d.credits==='number'?d.credits:START_CREDITS; S.history=d.history||[]; }
    }catch(e){}
  }
  function save(){
    try{ localStorage.setItem('allai_v1', JSON.stringify({user:S.user, credits:S.credits, history:S.history.slice(0,60)})); }catch(e){}
  }

  /* ---------- helpers ---------- */
  function $(id){return document.getElementById(id)}
  function esc(t){return String(t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function fmt(n){return Number(n).toLocaleString('id-ID')}
  function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function rng(seed){var a=seed;return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function toast(msg){var t=$('toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.add('hidden')},2600)}
  function imgModel(id){return IMG_MODELS.find(function(m){return m.id===id})}
  function vidModel(id){return VID_MODELS.find(function(m){return m.id===id})}
  function vidCost(){var m=vidModel(S.vid.model);return Math.round(DURATIONS[S.vid.dur]*m.mult)}
  function imgCost(){return imgModel(S.img.model).cost*S.img.n}

  function art(seed, ratio, video){
    var wh = RATIOS[ratio]||RATIOS['1:1'], w=wh[0], h=wh[1], r=rng(seed), hue=Math.floor(r()*360);
    var id='g'+seed;
    var s='<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pratinjau demo">'+
      '<defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl('+hue+',70%,58%)"/><stop offset="1" stop-color="hsl('+((hue+70)%360)+',75%,38%)"/></linearGradient>'+
      '<filter id="b'+seed+'"><feGaussianBlur stdDeviation="'+Math.round(w/16)+'"/></filter></defs>'+
      '<rect width="'+w+'" height="'+h+'" fill="url(#'+id+')"/><g filter="url(#b'+seed+')">';
    for(var i=0;i<5;i++){
      s+='<circle cx="'+Math.round(r()*w)+'" cy="'+Math.round(r()*h)+'" r="'+Math.round(w*(.14+r()*.28))+'" fill="hsl('+Math.floor((hue+r()*160)%360)+',85%,'+Math.round(55+r()*20)+'%)" opacity=".7"/>';
    }
    s+='</g>';
    if(video){ s+='<circle cx="'+w/2+'" cy="'+h/2+'" r="'+Math.round(Math.min(w,h)*.13)+'" fill="rgba(255,255,255,.88)"/><path d="M'+(w/2-Math.min(w,h)*.04)+' '+(h/2-Math.min(w,h)*.065)+'L'+(w/2+Math.min(w,h)*.07)+' '+h/2+'L'+(w/2-Math.min(w,h)*.04)+' '+(h/2+Math.min(w,h)*.065)+'Z" fill="#13203B"/>'; }
    return s+'</svg>';
  }

  /* ---------- login ---------- */
  function doLogin(){
    var email = $('email').value.trim().toLowerCase();
    var err = $('loginErr'); err.textContent='';
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ err.textContent='Masukkan email yang valid, misalnya nama@perusahaan.com.'; return; }
    if(WHITELIST.length && WHITELIST.indexOf(email)<0){ err.textContent='Email ini belum terdaftar di tim Canva Business yang diizinkan.'; return; }
    S.user = email;
    save(); showApp();
  }
  function showApp(){
    $('loginView').classList.add('hidden');
    $('appView').classList.remove('hidden');
    $('who').textContent = S.user;
    renderAll();
  }
  function logout(){ S.user=null; save(); $('appView').classList.add('hidden'); $('loginView').classList.remove('hidden'); }

  /* ---------- render ---------- */
  function renderAll(){ renderCredit(); renderTabs(); renderForm(); renderResults(); }
  function renderCredit(){ $('credit').textContent = fmt(S.credits)+' kredit'; }
  function renderTabs(){
    $('tabImage').setAttribute('aria-selected', S.tab==='image');
    $('tabVideo').setAttribute('aria-selected', S.tab==='video');
  }

  function renderForm(){
    var f = $('form'), h='';
    if(S.tab==='image'){
      var st=S.img, cur=imgModel(st.model), cost=imgCost(), short=cost>S.credits;
      h+='<span class="label">Tujuan gambar (otomatis pilih model)</span><div class="chips">'+
        PURPOSES.map(function(p){return '<button class="chip" data-purpose="'+esc(p.k)+'" aria-pressed="'+(st.purpose===p.k)+'">'+esc(p.k)+'</button>'}).join('')+'</div>';
      h+='<span class="label">Model</span><div class="models">'+IMG_MODELS.map(function(m){
        return '<button class="model" data-imodel="'+m.id+'" aria-pressed="'+(st.model===m.id)+'"'+(m.off?' disabled':'')+'><b>'+esc(m.name)+'</b><small>'+esc(m.desc)+'</small><span class="cost">'+(m.off?esc(m.off):fmt(m.cost)+' kredit per gambar')+'</span></button>';
      }).join('')+'</div>';
      h+='<label class="label" for="iprompt">Prompt</label><textarea id="iprompt" placeholder="Contoh: botol parfum di atas batu basah, cahaya pagi, latar kabut">'+esc(st.prompt)+'</textarea>'+
        '<div class="row" style="margin-top:8px"><button class="btn ghost small" id="enhance">Perkaya prompt</button><span class="muted" style="font-size:12.5px">Prompt singkat ditambah detail cahaya dan komposisi.</span></div>';
      h+='<span class="label">Rasio</span><div class="seg">'+Object.keys(RATIOS).map(function(r){return '<button data-iratio="'+r+'" aria-pressed="'+(st.ratio===r)+'">'+r+'</button>'}).join('')+'</div>';
      h+='<span class="label">Jumlah variasi</span><div class="seg">'+[1,2,3,4].map(function(n){return '<button data-in="'+n+'" aria-pressed="'+(st.n===n)+'">'+n+'</button>'}).join('')+'</div>';
      h+='<span class="label">Gambar referensi (opsional)</span><input type="file" id="ref" accept="image/*">'+
        '<div class="muted" style="font-size:12.5px;margin-top:6px">'+(st.ref?('Dipilih: '+esc(st.ref)):'Dipakai untuk menjaga karakter atau produk tetap konsisten.')+(cur.ref?'':' Model ini tidak mendukung referensi, jadi file akan diabaikan.')+'</div>';
      h+='<div class="estimate"><div class="sum"><span>Estimasi biaya</span><span class="'+(short?'low':'')+'">'+fmt(cost)+'</span></div>'+
        (short?'<div class="warn low">Kredit tidak cukup. Kurangi variasi atau pilih model lain.</div>':'<div class="warn" style="color:var(--muted)">Kredit otomatis dikembalikan jika generate gagal.</div>')+
        '<button class="btn block" id="go"'+(short?' disabled':'')+'>Generate gambar</button></div>';
      h+='<details class="tips"><summary>Tips supaya hasil lebih bagus</summary><ul><li>Sebut subjek, suasana, dan gaya dalam satu kalimat.</li><li>Untuk tulisan di gambar, pakai Ideogram dan tulis teksnya dalam tanda kutip.</li><li>Untuk edit foto atau karakter yang sama, pakai Nano Banana dengan gambar referensi.</li><li>Mulai dari 1 variasi, lalu naikkan setelah arahnya cocok.</li></ul></details>';
    } else {
      var v=S.vid, vm=vidModel(v.model), vc=vidCost(), vshort=vc>S.credits, ext = v.dur>vm.native, clips = Math.ceil(v.dur/vm.native);
      h+='<span class="label">Model</span><div class="models">'+VID_MODELS.map(function(m){
        return '<button class="model" data-vmodel="'+m.id+'" aria-pressed="'+(v.model===m.id)+'"><b>'+esc(m.name)+'</b><small>'+esc(m.desc)+'</small><span class="cost">Pengali x'+m.mult.toFixed(1).replace('.',',')+'</span></button>';
      }).join('')+'</div>';
      h+='<label class="label" for="vprompt">Prompt</label><textarea id="vprompt" placeholder="Contoh: kamera bergerak pelan mengitari secangkir kopi, uap naik, suasana kafe sore">'+esc(v.prompt)+'</textarea>';
      h+='<span class="label">Durasi</span><div class="seg">'+Object.keys(DURATIONS).map(function(d){return '<button data-vdur="'+d+'" aria-pressed="'+(String(v.dur)===d)+'">'+d+' detik</button>'}).join('')+'</div>';
      if(ext) h+='<div class="warn">'+esc(vm.name)+' kira-kira mendukung hingga '+vm.native+' detik per klip. Durasi ini dibuat dengan menyambung '+clips+' klip, jadi hasil bisa terasa terpotong.</div>';
      h+='<span class="label">Rasio</span><div class="seg">'+['16:9','9:16'].map(function(r){return '<button data-vratio="'+r+'" aria-pressed="'+(v.ratio===r)+'">'+r+'</button>'}).join('')+'</div>';
      h+='<div class="estimate"><div class="sum"><span>Estimasi biaya</span><span class="'+(vshort?'low':'')+'">'+fmt(vc)+'</span></div>'+
        '<div class="warn" style="color:var(--muted)">'+fmt(DURATIONS[v.dur])+' kredit dasar x '+vm.mult.toFixed(1).replace('.',',')+'. Video diproses di antrean dan bisa memakan beberapa menit.</div>'+
        (vshort?'<div class="warn low">Kredit tidak cukup untuk durasi dan model ini.</div>':'')+
        '<button class="btn block" id="go"'+(vshort?' disabled':'')+'>Generate video</button></div>';
    }
    f.innerHTML = h;
  }

  function renderResults(){
    var box=$('results'), h='';
    jobs.forEach(function(j){
      h+='<div class="item"><div class="job"><b>'+esc(j.label)+'</b><div class="muted" style="font-size:13px">'+esc(j.status)+'</div><div class="bar"><i style="width:'+j.pct+'%"></i></div></div></div>';
    });
    var list = S.history.filter(function(x){return !S.favOnly || x.fav});
    list.forEach(function(x){
      h+='<div class="item"><div class="thumb">'+art(x.seed,x.ratio,x.type==='video')+(x.type==='video'?'<span class="badge">'+x.dur+' dtk</span>':'')+'</div>'+
        '<div class="meta"><b>'+esc(x.model)+'</b>'+(x.type==='video'?'<span class="muted">'+x.dur+' detik, '+x.ratio+'</span>':'<span class="muted">'+x.ratio+'</span>')+'<span class="p">'+esc(x.prompt)+'</span></div>'+
        '<div class="acts"><button data-fav="'+x.id+'" aria-pressed="'+(!!x.fav)+'">Favorit</button><button data-again="'+x.id+'">Generate ulang</button><button data-canva="'+x.id+'">Kirim ke Canva</button></div></div>';
    });
    if(!jobs.length && !list.length){
      h='<div class="empty" style="grid-column:1/-1"><b>'+(S.favOnly?'Belum ada favorit':'Belum ada hasil')+'</b>'+(S.favOnly?'Tandai hasil dengan Favorit supaya muncul di sini.':'Tulis prompt di sebelah kiri, lalu pilih Generate.')+'</div>';
    }
    box.innerHTML=h;
  }

  /* ---------- generate (simulasi) ---------- */
  function generate(){
    var isImg = S.tab==='image', st = isImg?S.img:S.vid;
    var prompt = (st.prompt||'').trim();
    if(!prompt){ toast('Tulis prompt dulu.'); return; }
    var cost = isImg?imgCost():vidCost();
    if(cost>S.credits){ toast('Kredit tidak cukup.'); return; }
    S.credits -= cost; save(); renderCredit();
    var model = isImg?imgModel(st.model):vidModel(st.model);
    var job = {label:(isImg?'Gambar':'Video')+' dengan '+model.name, status:'Masuk antrean', pct:4};
    jobs.unshift(job); renderResults(); renderForm();
    var steps = isImg?['Masuk antrean','Memproses prompt','Membuat gambar','Menyelesaikan']:['Masuk antrean','Memproses prompt','Merender klip','Menyusun video','Menyelesaikan'];
    var i=0, total = isImg?1800:4200, tick=total/steps.length;
    var iv=setInterval(function(){
      i++;
      if(i<steps.length){ job.status=steps[i]; job.pct=Math.round(i/steps.length*100); renderResults(); return; }
      clearInterval(iv);
      jobs.splice(jobs.indexOf(job),1);
      if(Math.random()<0.08){
        S.credits += cost; save(); renderCredit(); renderResults();
        toast('Generate gagal di sisi model. '+fmt(cost)+' kredit sudah dikembalikan.');
        return;
      }
      var n = isImg?st.n:1;
      for(var k=0;k<n;k++){
        S.history.unshift({id:'h'+Date.now()+k, type:isImg?'image':'video', model:model.name, prompt:prompt, ratio:st.ratio, dur:isImg?0:st.dur, seed:hash(prompt+model.id+Date.now()+k), fav:false});
      }
      save(); renderResults();
      toast('Selesai. Hasil ditambahkan ke daftar.');
    }, tick);
  }

  function enhance(){
    var t=($('iprompt').value||'').trim();
    if(!t){ toast('Tulis prompt singkat dulu.'); return; }
    S.img.prompt = t.replace(/[.\s]+$/,'')+', pencahayaan lembut dan natural, komposisi seimbang, detail tajam, warna harmonis, kualitas tinggi';
    renderForm();
  }

  /* ---------- events ---------- */
  document.addEventListener('click',function(e){
    var b=e.target.closest('button'); if(!b) return;
    var d=b.dataset;
    if(b.id==='loginBtn') return doLogin();
    if(b.id==='logoutBtn') return logout();
    if(b.id==='go') return generate();
    if(b.id==='enhance') return enhance();
    if(b.id==='favFilter'){ S.favOnly=!S.favOnly; b.setAttribute('aria-pressed',S.favOnly); return renderResults(); }
    if(b.id==='resetBtn'){ S.credits=START_CREDITS; S.history=[]; save(); renderAll(); return toast('Demo direset ke 8.500 kredit.'); }
    if(d.tab){ S.tab=d.tab; return renderAll(); }
    if(d.purpose){ var p=PURPOSES.find(function(x){return x.k===d.purpose}); S.img.purpose=p.k; S.img.model=p.m; return renderForm(); }
    if(d.imodel){ S.img.model=d.imodel; S.img.purpose=''; return renderForm(); }
    if(d.iratio){ S.img.ratio=d.iratio; return renderForm(); }
    if(d.in){ S.img.n=+d.in; return renderForm(); }
    if(d.vmodel){ S.vid.model=d.vmodel; return renderForm(); }
    if(d.vdur){ S.vid.dur=+d.vdur; return renderForm(); }
    if(d.vratio){ S.vid.ratio=d.vratio; return renderForm(); }
    if(d.fav){ var x=S.history.find(function(h){return h.id===d.fav}); if(x){x.fav=!x.fav; save(); renderResults();} return; }
    if(d.again){
      var y=S.history.find(function(h){return h.id===d.again}); if(!y) return;
      S.tab=y.type; var m;
      if(y.type==='image'){ m=IMG_MODELS.find(function(q){return q.name===y.model}); S.img.prompt=y.prompt; S.img.ratio=y.ratio; S.img.n=1; if(m)S.img.model=m.id; }
      else { m=VID_MODELS.find(function(q){return q.name===y.model}); S.vid.prompt=y.prompt; S.vid.ratio=y.ratio; S.vid.dur=y.dur; if(m)S.vid.model=m.id; }
      renderAll(); return generate();
    }
    if(d.canva){ return toast('Demo: di versi produksi, aset ini diunggah ke Canva lewat Connect API.'); }
  });
  document.addEventListener('input',function(e){
    if(e.target.id==='iprompt') S.img.prompt=e.target.value;
    if(e.target.id==='vprompt') S.vid.prompt=e.target.value;
  });
  document.addEventListener('change',function(e){
    if(e.target.id==='ref'){ S.img.ref = e.target.files[0]?e.target.files[0].name:''; renderForm(); }
  });
  $('email').addEventListener('keydown',function(e){ if(e.key==='Enter') doLogin(); });

  /* ---------- init ---------- */
  load();
  if(S.user) showApp();
})();
