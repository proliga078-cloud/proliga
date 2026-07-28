const Stripe=require('stripe')
const stripe=Stripe(process.env.STRIPE_SECRET_KEY)
// Apenas o plano Pro esta a venda. O Premium foi descontinuado do site;
// subscricoes antigas continuam validas mas nao se aceitam novas.
const PRICE_MAP={pro_monthly:process.env.STRIPE_PRICE_PRO_MONTHLY,pro_yearly:process.env.STRIPE_PRICE_PRO_YEARLY}

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
// Os precos estao definidos no Stripe como "sem imposto incluido"
// (tax_behavior=exclusive). O automatic_tax faz o Stripe calcular e
// acrescentar o IVA por cima, com base na morada do cliente.
// Enquanto nao existir um cadastro fiscal ativo em Tax > Localizacoes,
// o Stripe devolve imposto = 0 e o total continua a ser o preco base.
automatic_tax:{enabled:true},
// O calculo de imposto precisa da morada do comprador.
billing_address_collection:'required',
// Permite ao profissional indicar o NIF, necessario para a fatura.
tax_id_collection:{enabled:true},
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
