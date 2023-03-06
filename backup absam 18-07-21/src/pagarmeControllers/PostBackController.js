
import pagarme from 'pagarme';
import db from '../database/connection.js';
import knex from 'knex';
import mysql2 from 'mysql2'


import authConfig from '../config/auth.js';


export default class PostBackController {

    async showDataBase(req, response, next) {

        const dados = req.body
        const externalId = dados.subscription.customer.external_id
        
        var dataHoje = new Date();
        dataHoje.toLocaleString()


        const dataBase = await db('assinatura')
            .where('usuario_id', '=', externalId)

        const postDataBase = dataBase[0]

        // Alteração de plano boleto. Pago!
        if ((postDataBase.plano_id != dados.subscription.plan.id) && 
        (postDataBase.metodo_pagamento_plano == dados.subscription.current_transaction.payment_method)  &&
         dados.current_status == 'paid') {

            const insereDados = {
                data_processamento_pagamento: new Date().toISOString().split('T')[0],
                status_assinatura: dados.current_status,
                assinatura_id: dados.id,
                transacao_id: dados.subscription.current_transaction.id,
                data_transacao: new Date().toISOString().split('T')[0],
                valor_plano: dados.subscription.plan.amount,
                plano_id: dados.subscription.plan.id,
                plano: dados.subscription.plan.name,
                metodo_pagamento_plano: dados.subscription.payment_method,
                codigo_autorizacao: dados.subscription.current_transaction.authorization_code,
                nsu: dados.subscription.current_transaction.nsu,
                chave_referencia: dados.subscription.current_transaction.reference_key,
                url_assinatura: dados.subscription.manage_url,
                ultima_atualizacao: dataHoje.toLocaleString(dataHoje.setDate(dataHoje.getDate())),
                metodo_pagamento_utilizado: dados.subscription.payment_method
            }

            await db.update(insereDados).into("assinatura")
                .where('usuario_id', '=', externalId)

            console.log('1 ► Alteração de plano boleto. Cliente pagou!')

            return response.status(200)


            // Alteração de plano boleto Não Pago!
        }  if ((postDataBase.plano_id != dados.subscription.plan.id) && dados.current_status == 'unpaid') {

            const insereDados = {
                ultima_atualizacao: dataHoje.toLocaleString(dataHoje.setDate(dataHoje.getDate())),
            }

            await db.update(insereDados).into("assinatura")
                .where('usuario_id', '=', externalId)

            console.log('2 ► Alteração de plano boleto. Cliente Não Pagou!')

            return response.status(200)

            // Mudança de metodo de pagamento de cartão de credito para boleto. Pago!
        } if ((postDataBase.metodo_pagamento_plano != dados.subscription.current_transaction.payment_method) && 
        dados.current_status == 'paid') {

            //Cancelamento da assinatura antiga com metodo de pagamento cartão de credito
            await pagarme.client.connect({
                    api_key: authConfig.keyApi
                })
                .then(client => client.subscriptions.cancel({
                    id: postDataBase.assinatura_id
                })).then(subscription => console.log(subscription)).catch(function(err) {
                    if (err) {
                        console.log(err.responseponse)
                    }
                })


            const insereDados = {
                data_processamento_pagamento: new Date().toISOString().split('T')[0],
                status_assinatura: dados.current_status,
                assinatura_id: dados.id,
                transacao_id: dados.subscription.current_transaction.id,
                data_transacao: new Date().toISOString().split('T')[0],
                valor_plano: dados.subscription.plan.amount,
                plano_id: dados.subscription.plan.id,
                plano: dados.subscription.plan.name,
                metodo_pagamento_plano: dados.subscription.payment_method,
                codigo_autorizacao: dados.subscription.current_transaction.authorization_code,
                nsu: dados.subscription.current_transaction.nsu,
                chave_referencia: dados.subscription.current_transaction.reference_key,
                url_assinatura: dados.subscription.manage_url,
                ultima_atualizacao: dataHoje.toLocaleString(dataHoje.setDate(dataHoje.getDate())),
                metodo_pagamento_utilizado: "boleto",
            }

            await db.update(insereDados).into("assinatura")
                .where('usuario_id', '=', externalId)

            console.log('3 ► Mudanca de metodo de pagamento de credito para boleto. Cliente pagou!')

            return response.status(200)

            // Mudança de metodo de pagamento de cartão de credito para boleto. Não Pago!
        }  if ((postDataBase.metodo_pagamento_plano != dados.subscription.current_transaction.payment_method) &&
         dados.current_status == 'unpaid') {


            // Cancelamento da assinatura que veio no postback com metodo de pagamento cartão de credito
            // await pagarme.client.connect({
            //         api_key: authConfig.keyApi
            //     })
            //     .then(client => client.subscriptions.cancel({
            //         id: dados.id
            //     })).then(subscription => console.log(subscription)).catch(function(err) {
            //         if (err) {
            //             console.log(err.responseponse.errors)
            //         }
            //     })


            const insereDados = {
                ultima_atualizacao: dataHoje.toLocaleString(dataHoje.setDate(dataHoje.getDate())),
            }

            await db.update(insereDados).into("assinatura")
                .where('usuario_id', '=', externalId)

            console.log('4 ► Mudanca de metodo de pagamento de credito para boleto. Cliente não pagou! Cancelar assinatura que veio no postback')

            return response.status(200)

            // retorno do cancelamento de assinatura, apos a mudança de metodo de pagamento. Pago!
        }  if (postDataBase.data_processamento_pagamento == new Date().toISOString().split('T')[0] &&
         postDataBase.metodo_pagamento_plano != dados.subscription.current_transaction.payment_method &&
          dados.current_status == 'canceled') {

            console.log('5 ► Postback do cancelamento na mudança de metodo. Não fazer nada! Pago...')

            return response.status(200)

            // retorno do cancelamento de assinatura, apos a mudança de metodo de pagamento. Não Pago!
        }  if (dados.subscription.current_transaction.payment_method != postDataBase.metodo_pagamento_plano && dados.current_status == 'canceled') {

            console.log('6 ► Postback do cancelamento na mudança de metodo. Não fazer nada! Não Pago..')

            return response.status(200)

            //Aviso de pendencia de pagamento
            //A assinatura ainda não foi paga, porém não ultrapassou o limite de dias de tolerância.
        }  if ((postDataBase.plano_id == dados.subscription.plan.id)
         && dados.current_status == "waiting_payment") {

            const insereDados = {
                status_assinatura: dados.current_status,
                link_boleto: dados.subscription.current_transaction.boleto_url
            }

            await db.update(insereDados).into("assinatura")
                .where('usuario_id', '=', externalId)

            console.log("7 ► Somente um postback avisando pendencia. Atualizar o status no banco")

            return response.status(200)


        }  if((postDataBase.plano_id == dados.subscription.plan.id) && dados.current_status != "waiting_payment") {

            // Atualizar status da assinatura no Banco
            const insereDados = {
                data_processamento_pagamento: new Date().toISOString().split('T')[0],
                status_assinatura: dados.current_status,
                assinatura_id: dados.id,
                transacao_id: dados.subscription.current_transaction.id,
                data_transacao: new Date().toISOString().split('T')[0],
                valor_plano: dados.subscription.plan.amount,
                plano_id: dados.subscription.plan.id,
                plano: dados.subscription.plan.name,
                metodo_pagamento_plano: dados.subscription.payment_method,
                codigo_autorizacao: dados.subscription.current_transaction.authorization_code,
                nsu: dados.subscription.current_transaction.nsu,
                chave_referencia: dados.subscription.current_transaction.reference_key,
                url_assinatura: dados.subscription.manage_url,
                ultima_atualizacao: dataHoje.toLocaleString(dataHoje.setDate(dataHoje.getDate())),
                metodo_pagamento_utilizado: dados.subscription.payment_method
            }

            await db.update(insereDados).into("assinatura")
                .where('usuario_id', '=', externalId)

            console.log(`8 ► Apenas atualizar o status pois é ${dados.current_status}`)

            return response.status(200)

        }else{
            console.log("9 ► deu nada")
            return response.status(200)
        }


    }
}