import express from 'express';
import pagarme from 'pagarme';
import db from '../database/connection.js';


import authConfig from '../config/auth.js'



export default class AtualizarInfoCartaoCreditoController {

    async showDataBase(req, res, next) {

        var dataHoje = new Date()
        dataHoje.toLocaleString()


        // Variaveis recebidas do front
        const usuarioLogado = req.headers.userId;
        const numeroCartao = req.body.numeroCartao;
        const nomeImpressoCartao = req.body.nomeImpressoCartao;
        const validadeCartao = req.body.validadeCartao;
        const cvvCartao = req.body.cvvCartao;

        const recebeDados = await db("assinatura")
            .where("assinatura.usuario_id", "=", usuarioLogado)

        const postDataBase = recebeDados[0];



        // Requisição na Pagarme para codificar o cartão, e gerar o card_id para criar a assinatura por cartão de crédito
        //
        let erroPagarmeCardId = ''
        await pagarme.client.connect({
                api_key: authConfig.keyApi
            })
            .then(client => client.cards.create({
                card_number: numeroCartao,
                card_holder_name: nomeImpressoCartao,
                card_expiration_date: validadeCartao,
                card_cvv: cvvCartao,
            }))
            .then(card => showDataCardId(card))
            .catch(function(err) {
                if (err) {

                    erroPagarmeCardId = err.response.errors
                    return res.status(400).json({ mensagem: erroPagarmeCardId[0].message, status: 'error', title: 'Ops!' });
                }
            })

        function showDataCardId(data) {
            req.bodyCardid = data
        }


        //Requisição na Pagarme para atualizar informações de cartão de credito da assinatura atual
        let erroPagarme = ''
        await pagarme.client.connect({
                api_key: authConfig.keyApi
            })
            .then(client => client.subscriptions.update({
                id: postDataBase.assinatura_id,
                payment_method: "credit_card",
                card_id: req.bodyCardid.id,
                card_number: numeroCartao,
                card_holder_name: nomeImpressoCartao,
                card_expiration_date: validadeCartao,
                card_cvv: cvvCartao
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

            // Variavel insereDados recebe todos os dados para gravar no banco de dados
            const insereDados = {
                cartao_gerado_id: req.bodyCardid.id,
                data_criacao_cartao: req.bodySubscription.date_created.split('T')[0],
                nome_portador_cartao: req.bodySubscription.card.holder_name,
                ultimos_digitos_cartao_criado: req.bodySubscription.card.last_digits,
                status_assinatura: req.bodySubscription.current_transaction.status,
                codigo_autorizacao: req.bodySubscription.current_transaction.authorized_amount,
                nsu: req.bodySubscription.current_transaction.nsu,
                data_transacao: req.bodySubscription.current_transaction.date_created.split('T')[0],
                transacao_id: req.bodySubscription.current_transaction.id,
                ultima_atualizacao: dataHoje.toLocaleString(dataHoje.setDate(dataHoje.getDate())),
                ultima_acao: "Alteração dos dados do cartão de crédito"

            }

            //realiza o update, conforme o usuario enviado pelo front na variavel usuarioLogado
            db.update(insereDados).into("assinatura")
                .where("assinatura.usuario_id", "=", usuarioLogado).then(insereDados => {

                    const postData = req.bodySubscription
                    return res.status(200).json({ mensagem: 'Informações atualizadas com sucesso!', status: 'success', title: 'Tudo certo!' });

                })
                .catch(function(err) {
                    if (err) {
                        console.log("Não foi possível salvar no banco de dados")
                    }
                })
        }

    }

}