const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const qrcode = require('qrcode-terminal')
const fs = require('fs')
if(!fs.existsSync('keuangan.json')) fs.writeFileSync('keuangan.json', JSON.stringify({masuk:[],keluar:[],saldoAwal:{}}))
const load=()=>{try{return JSON.parse(fs.readFileSync('keuangan.json'))}catch(e){return {masuk:[],keluar:[],saldoAwal:{}}}}
const save=(d)=>fs.writeFileSync('keuangan.json', JSON.stringify(d,null,2))
const rp=n=>'Rp '+Number(n).toLocaleString('id-ID')
const today=()=>new Date().toLocaleDateString('id-ID',{weekday:'long', day:'numeric', month:'long', year:'numeric'})
const tgl=()=>new Date().toISOString().slice(0,10)
const bulanIni=()=>new Date().toISOString().slice(0,7)
function getSaldoSebelum(b){let db=load();let a=0;let batas=b+'-01';(db.masuk||[]).forEach(x=>{if(x.tanggal && x.tanggal<batas)a+=x.jumlah});(db.keluar||[]).forEach(x=>{if(x.tanggal && x.tanggal<batas)a-=x.jumlah});return a}
async function start(){
  const {state,saveCreds}=await useMultiFileAuthState('session')
  const sock=makeWASocket({auth:state})
  sock.ev.on('creds.update',saveCreds)
  sock.ev.on('connection.update',u=>{if(u.qr) qrcode.generate(u.qr,{small:true});if(u.connection==='open') console.log('Rezeki Melimpah Ruah KENDARI AKTIF');if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode!==401) start()})
  sock.ev.on('messages.upsert',async m=>{
    const msg=m.messages[0]; if(!msg.message||msg.key.fromMe) return
    const from=msg.key.remoteJid
    const raw=msg.message.conversation||msg.message.extendedTextMessage?.text||''
    const text=raw.toLowerCase().trim()
    let db=load(); const jam=new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}); const bIni=bulanIni()
    if(text.startsWith('masuk ')){const p=raw.split(' ');const j=parseInt(p[1].replace(/\./g,''));if(!isNaN(j)){db.masuk.push({tanggal:tgl(),jam,jumlah:j,ket:p.slice(2).join(' ')});save(db);await sock.sendMessage(from,{text:'✅ Masuk '+rp(j)+' tercatat'})}return}
    if(text.startsWith('keluar ')){const p=raw.split(' ');const j=parseInt(p[1].replace(/\./g,''));if(!isNaN(j)){db.keluar.push({tanggal:tgl(),jam,jumlah:j,ket:p.slice(2).join(' ')});save(db);await sock.sendMessage(from,{text:'📉 Keluar '+rp(j)+' tercatat'})}return}
    if(text==='1'){const s=getSaldoSebelum(bIni);return sock.sendMessage(from,{text:'💰 SALDO AWAL '+bIni+'\n\n🔄 Auto dari bulan lalu:\n'+rp(s)})}
    if(text==='2'){return sock.sendMessage(from,{text:'📈 Uang Masuk\nKetik: masuk 25000 pentol'})}
    if(text==='3'){return sock.sendMessage(from,{text:'📉 Uang Keluar\nKetik: keluar 5000 plastik'})}
    if(text==='4'){
      const awal=getSaldoSebelum(bIni)
      const mB=(db.masuk||[]).filter(x=>x.tanggal && x.tanggal.startsWith(bIni)).reduce((a,b)=>a+b.jumlah,0)
      const kB=(db.keluar||[]).filter(x=>x.tanggal && x.tanggal.startsWith(bIni)).reduce((a,b)=>a+b.jumlah,0)
      const sisa=awal+mB-kB
      return sock.sendMessage(from,{text:'🪙 SISA SALDO\n\nAwal: '+rp(awal)+'\nMasuk: '+rp(mB)+'\nKeluar: '+rp(kB)+'\n━━━━━━━━━━━━\nSISA: '+rp(sisa)})
    }
    if(text==='5'){
      const hari=tgl()
      const mH=(db.masuk||[]).filter(x=>x.tanggal===hari)
      const kH=(db.keluar||[]).filter(x=>x.tanggal===hari)
      let teks='📊 LAPORAN HARIAN\n'+today()+'\n\nMasuk: '+rp(mH.reduce((a,b)=>a+b.jumlah,0))+'\n'+mH.map(x=> '• '+x.jam+' - '+rp(x.jumlah)).join('\n')+'\n\nKeluar: '+rp(kH.reduce((a,b)=>a+b.jumlah,0))+'\n'+kH.map(x=>'• '+x.jam+' - '+rp(x.jumlah)).join('\n')
      return sock.sendMessage(from,{text:teks})
    }
    if(text==='6'){
      const data={}
      ;(db.masuk||[]).filter(x=>x.tanggal && x.tanggal.startsWith(bIni)).forEach(x=>{if(!data[x.tanggal])data[x.tanggal]={m:0,k:0};data[x.tanggal].m+=x.jumlah})
      ;(db.keluar||[]).filter(x=>x.tanggal && x.tanggal.startsWith(bIni)).forEach(x=>{if(!data[x.tanggal])data[x.tanggal]={m:0,k:0};data[x.tanggal].k+=x.jumlah})
      let teks='🗓 LAPORAN BULANAN '+bIni+'\n\n'
      Object.keys(data).sort().forEach(t=>{teks+=t.slice(8)+': M:'+rp(data[t].m)+' K:'+rp(data[t].k)+'\n'})
      return sock.sendMessage(from,{text:teks||'Belum ada data'})
    }
    return sock.sendMessage(from,{text:'✨ Rezeki Melimpah Ruah ✨\n┏━━━━━━━━━━━━━━━━\n┃ 📅 '+today()+'\n┃ ⏰ '+jam+' WITA\n┃ 📍 Kendari\n┗━━━━━━━━━━━━━━━━\n\nHai! 👋🏻\nSilahkan pilih menu utama di bawah ini, yaa ☺️\n\n💼 MENU UTAMA\n1 💰 Saldo Awal\n2 📈 Uang Masuk\n3 📉 Uang Keluar\n4 🪙 Sisa Saldo\n5 📊 Laporan Harian\n6 🗓 Laporan Bulanan + Grafik Trendy\n\n━━━━━━━━━━━━━━━━\nKetik Angka 1-6 Saja'})
  })
}
start()
