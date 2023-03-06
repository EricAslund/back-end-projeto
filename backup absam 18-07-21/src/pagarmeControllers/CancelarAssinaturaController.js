import express from 'express';
import pagarme from 'pagarme';
import db from '../database/connection.js';

import authConfig from '../config/auth.js'





export default class CancelarAssinaturaController {

    async showDataBase(req, res, next) {

        var dataHoje = new Date()
        dataHoje.toLocaleString()

        const usuarioLogado = req.headers.userId;

        // Busca no banco de dados para identificar o id da assinatura atual 
        const recebeDados = await db("assinatura")
            .where("assinatura.usuario_id", "=", usuarioLogado)

        const postDataBase = recebeDados[0];

        //verifica se a assinatura possui mais de 1
        // Se a data de hoje é maior que a data do vencimento da assinatura, pode cancelar
        // if (new Date().toISOString().split('T')[0] > postDataBase.vencimento_assinatura.split('T')[0]) {


            let erroPagarme = ''
            await pagarme.client.connect({
                    api_key: authConfig.keyApi
                })
                .then(client => client.subscriptions.cancel({
                    id: postDataBase.assinatura_id
                }))
                .then(subscription => showDataSubscription(subscription))
                .catch(function(err) {
                    if (err) {

                        erroPagarme = err.response.errors
                    }
                })

            function showDataSubscription(data) {
                req.bodySubscription = data
            }

            if (req.bodySubscription == undefined) {
                return res.status(400).json({ mensagem: erroPagarme[0].message, status: 'error', title: 'Ops!' });

            } else {

                // salvar no banco de dados as informações recebidas da Pagar.me
                const insereDados = {
                    status_assinatura: req.bodySubscription.status,
                    ultima_atualizacao: dataHoje.toLocaleString(dataHoje.setDate(dataHoje.getDate())),
                    ultima_acao: "Cancelamento de assinatura"
                }

                db.update(insereDados).into("assinatura")
                    .where("assinatura.usuario_id", "=", usuarioLogado).then(insereDados => {

                        const postData = req.bodySubscription
                        return res.status(200).json({ mensagem: 'Assinatura cancelada com sucesso!', status: 'success', title: 'Que pena!' });

                    })
                    .catch(function(err) {
                        if (err) {
                            console.log("Não foi possível salvar no banco de dados")
                        }
                    })


            }
        // } else {

        //     const postData = req.bodySubscription
        //     return res.status(400).json({ mensagem: 'Não foi possível cancelar sua assinatura, ela ainda está no período vigente de 1 ano', status: 'error', title: 'Ops' });


        // }
    }
}