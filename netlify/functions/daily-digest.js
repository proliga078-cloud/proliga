const{createClient}=require('@supabase/supabase-js')
const{sendPush}=require('./_push')

const admin=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY)

// Corre uma vez por dia (ver netlify.toml). Manda um resumo por notificacao
// push só a quem tem mesmo algo que precise de atenção — sem spam diário.
exports.handler=async()=>{
  try{
    const{data:pros}=await admin.from('profiles').select('id,name').eq('is_demo',false).neq('notify_digest',false)
    if(!pros||!pros.length)return{statusCode:200,body:JSON.stringify({sent:0,total:0})}

    const today=new Date();today.setHours(0,0,0,0)
    const tomorrow=new Date(today.getTime()+86400000)
    const todayISO=today.toISOString(),tomorrowISO=tomorrow.toISOString()

    let sent=0
    for(const pro of pros){
      const{data:jobsToday}=await admin.from('jobs').select('id')
        .eq('professional_id',pro.id).gte('scheduled_at',todayISO).lt('scheduled_at',tomorrowISO)
      const{data:pendingQuotes}=await admin.from('jobs').select('id')
        .eq('professional_id',pro.id).eq('status','orcamento_enviado')
      const{data:convos}=await admin.from('conversations').select('id').eq('professional_id',pro.id)

      let unread=0
      if(convos&&convos.length){
        const{count}=await admin.from('messages').select('*',{count:'exact',head:true})
          .in('conversation_id',convos.map(c=>c.id)).eq('read',false).neq('sender_id',pro.id)
        unread=count||0
      }

      const parts=[]
      if(jobsToday&&jobsToday.length)parts.push(jobsToday.length+' trabalho'+(jobsToday.length>1?'s':'')+' hoje')
      if(pendingQuotes&&pendingQuotes.length)parts.push(pendingQuotes.length+' orçamento'+(pendingQuotes.length>1?'s':'')+' por responder')
      if(unread>0)parts.push(unread+' mensagem'+(unread>1?'s':'')+' por ler')
      if(!parts.length)continue

      const r=await sendPush(pro.id,{
        title:'O teu resumo do dia',
        body:parts.join(' · '),
        url:'/dashboard.html',
        tag:'daily-digest'
      })
      if(r&&r.sent)sent++
    }
    return{statusCode:200,body:JSON.stringify({sent,total:pros.length})}
  }catch(err){
    console.error('daily-digest error:',err)
    return{statusCode:500,body:JSON.stringify({error:err.message})}
  }
}
