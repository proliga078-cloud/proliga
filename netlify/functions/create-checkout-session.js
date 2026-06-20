const Stripe=require('stripe')
const stripe=Stripe(process.env.STRIPE_SECRET_KEY)
const PRICE_MAP={pro_monthly:process.env.STRIPE_PRICE_PRO_MONTHLY,pro_yearly:process.env.STRIPE_PRICE_PRO_YEARLY,premium_monthly:process.env.STRIPE_PRICE_PREMIUM_MONTHLY,premium_yearly:process.env.STRIPE_PRICE_PREMIUM_YEARLY}

exports.handler=async(event)=>{
if(event.httpMethod!=='POST')return{statusCode:405,body:'Method Not Allowed'}
try{
const{plan,billing,userId,email}=JSON.parse(event.body||'{}')
if(!userId||!email)return{statusCode:400,body:JSON.stringify({error:'Falta userId ou email. Inicia sessão primeiro.'})}
const priceId=PRICE_MAP[`${plan}_${billing}`]
if(!priceId)return{statusCode:400,body:JSON.stringify({error:'Plano ou periodicidade inválidos.'})}
const siteUrl=process.env.URL||`https://${event.headers.host}`
const session=await stripe.checkout.sessions.create({
mode:'subscription',
payment_method_types:['card'],
line_items:[{price:priceId,quantity:1}],
customer_email:email,
client_reference_id:userId,
subscription_data:{metadata:{supabase_user_id:userId,plan}},
success_url:`${siteUrl}/dashboard.html?checkout=success`,
cancel_url:`${siteUrl}/pricing.html?checkout=cancel`,
allow_promotion_codes:true
})
return{statusCode:200,body:JSON.stringify({url:session.url})}
}catch(err){
console.error('create-checkout-session error:',err)
return{statusCode:500,body:JSON.stringify({error:err.message})}
}
}
