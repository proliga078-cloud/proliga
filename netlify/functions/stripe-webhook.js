const Stripe=require('stripe')
const{createClient}=require('@supabase/supabase-js')
const stripe=Stripe(process.env.STRIPE_SECRET_KEY)
const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY)

exports.handler=async(event)=>{
const sig=event.headers['stripe-signature']
let stripeEvent
try{
const payload=event.isBase64Encoded?Buffer.from(event.body,'base64'):event.body
stripeEvent=stripe.webhooks.constructEvent(payload,sig,process.env.STRIPE_WEBHOOK_SECRET)
}catch(err){
console.error('Webhook signature verification failed:',err.message)
return{statusCode:400,body:`Webhook Error: ${err.message}`}
}
try{
if(stripeEvent.type==='checkout.session.completed'){
const session=stripeEvent.data.object
const userId=session.client_reference_id
let plan='pro'
if(session.subscription){
const sub=await stripe.subscriptions.retrieve(session.subscription)
plan=sub.metadata?.plan||plan
}
if(userId){
await supabase.from('profiles').update({plan,stripe_customer_id:session.customer,stripe_subscription_id:session.subscription}).eq('id',userId)
}
}else if(stripeEvent.type==='customer.subscription.updated'){
const sub=stripeEvent.data.object
const plan=sub.metadata?.plan
if(plan&&sub.status==='active'){
await supabase.from('profiles').update({plan}).eq('stripe_subscription_id',sub.id)
}
}else if(stripeEvent.type==='customer.subscription.deleted'){
const sub=stripeEvent.data.object
await supabase.from('profiles').update({plan:'free',stripe_subscription_id:null}).eq('stripe_subscription_id',sub.id)
}
return{statusCode:200,body:JSON.stringify({received:true})}
}catch(err){
console.error('stripe-webhook handler error:',err)
return{statusCode:500,body:JSON.stringify({error:err.message})}
}
}
