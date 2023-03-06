import express from 'express';
import pagarme from 'pagarme';
import db from '../database/connection.js';


import authConfig from '../config/auth.js'


export default class AlterarPlanoController {

    async boleto(req, res, next) {

        var dataHoje = new Date()
        dataHoje.toLocaleString()

        const usuarioLogado = req.headers.userId;
        const idNovoPlano = req.body.idPlano;

        const recebeDados = await db("assinatura")
            .where("assinatura.usuario_id", "=", usuarioLogado)

        const postDataBase = recebeDados[0];



        // Requisição na pagarme para alteração de plano no metodo de pagamento boleto
        let erroPagarme = ''
        await pagarme.client.connect({
                api_key: authConfig.keyApi
            })
            .then(client => client.subscriptions.update({
                id: postDataBase.assinatura_id,
                plan_id: idNovoPlano
            }))
            .then(subscription => showDataUpdateSubscription(subscription))
            .catch(function(err) {
                if (err) {

                    erroPagarme = err.response.errors
                }
            })

        function showDataUpdateSubscription(data) {
            req.bodyNewSubscription = data
        }

        // Se gerar algum erro na criação da assinatura, a variavel erroPagarme será preenchida e seu valor retornado ao front
        if (req.bodyNewSubscription == undefined) {

            return res.status(400).json({ mensagem: erroPagarme[0].message, status: 'error', title: 'Ops!' });
        } else {

            const insereDados = {
                ultima_atualizacao: dataHoje.toLocaleString(dataHoje.setDate(dataHoje.getDate())),
                ultima_acao: "Alteração de plano no metodo de pagamento boleto"
            }

            db.update(insereDados).into("assinatura")
                .where("assinatura.usuario_id", "=", usuarioLogado).then(insereDados => {

                    const postData = req.bodyNewSubscription
                    return res.status(200).json({ mensagem: 'Alteração solicitada com sucesso! Pague o boleto antes do vencimento!', status: 'success', title: 'Plano alterado com sucesso!' });

                }).catch(function(err) {
                    if (err) {
                        console.log("Erro ao salvar no banco de dados")
                    }
                })
        }


    }
    async credito(req, res, next) {

        var dataHoje = new Date()
        dataHoje.toLocaleString()

        const usuarioLogado = req.headers.userId;
        const idNovoPlano = req.body.idPlano;

        const recebeDados = await db("assinatura")
            .where("assinatura.usuario_id", "=", usuarioLogado)

        const postDataBase = recebeDados[0];


        // Requisição na pagarme para alteração de plano
        let erroPagarme = ''
        await pagarme.client.connect({
                api_key: authConfig.keyApi
            })
            .then(client => client.subscriptions.update({
                id: postDataBase.assinatura_id,
                plan_id: idNovoPlano
            }))
            .then(subscription => showDataUpdateSubscription(subscription))
            .catch(function(err) {
                if (err) {

                    erroPagarme = err.response.errors
                }
            })

        function showDataUpdateSubscription(data) {
            req.bodyNewSubscription = data
        }


        if (req.bodyNewSubscription == undefined) {

            return res.status(400).json({ mensagem: erroPagarme[0].message, status: 'error', title: 'Ops!' });
        } else {


            const insereDados = {
                plano_id: req.bodyNewSubscription.plan.id,
                valor_plano: req.bodyNewSubscription.plan.amount,
                plano: req.bodyNewSubscription.plan.name,
                metodo_pagamento_plano: req.bodyNewSubscription.plan.payment_methods,
                status_assinatura: req.bodyNewSubscription.current_transaction.status,
                codigo_autorizacao: req.bodyNewSubscription.current_transaction.authorization_code,
                nsu: req.bodyNewSubscription.current_transaction.nsu,
                data_transacao: req.bodyNewSubscription.current_transaction.date_created.split('T')[0],
                transacao_id: req.bodyNewSubscription.current_transaction.id,
                metodo_pagamento_utilizado: req.bodyNewSubscription.current_transaction.payment_method,
                assinatura_id: req.bodyNewSubscription.current_transaction.subscription_id,
                chave_referencia: req.bodyNewSubscription.current_transaction.reference_key,
                cliente_pargarme_id: req.bodyNewSubscription.customer.id,
                url_assinatura: req.bodyNewSubscription.manage_url,
                ultima_atualizacao: dataHoje.toLocaleString(dataHoje.setDate(dataHoje.getDate())),
                ultima_acao: "Alteração de plano no metodo de pagamento cartão de crédito"
            }

            db.update(insereDados).into("assinatura")
                .where("assinatura.usuario_id", "=", usuarioLogado).then(insereDados => {

                    const postData = req.bodyNewSubscription
                    return res.status(200).json({ mensagem: '', status: 'success', title: 'Plano alterado com sucesso!' });

                }).catch(function(err) {
                    if (err) {

                        console.log("Erro ao salvar no banco de dados")
                    }
                })
        }


    }
}