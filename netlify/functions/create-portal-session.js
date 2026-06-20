const Stripe=require('stripe')
  const stripe=Stripe(process.env.STRIPE_SECRET_KEY)

  exports.handler=async(event)=>{
    if(event.httpMethod!=='POST')return{statusCode:405,body:'Method Not Allowed'}
          try{
            const{customerId}=JSON.parse(event.body||'{}')
              if(!customerId)return{statusCode:400,body:JSON.stringify({error:'Falta customerId.'})}
                  const siteUrl=process.env.URL||`https://${event.headers.host}`
                  const portal=await stripe.billingPortal.sessions.create({customer:customerId,return_url:`${siteUrl}/dashboard.html`})
                  return{statusCode:200,body:JSON.stringify({url:portal.url})}
                  }catch(err){
                    console.error('create-portal-session error:',err)
                    return{statusCode:500,body:JSON.stringify({error:err.message})}
                  }
                }
                  
