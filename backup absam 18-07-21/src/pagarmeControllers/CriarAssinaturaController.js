import express from 'express';
import pagarme from 'pagarme';
import db from '../database/connection.js';


import crypto from 'crypto';
import authConfig from '../config/auth.js'


export default class CriarAssinaturaController {

    async boleto(req, res, next) {

        var dataHoje = new Date()
        dataHoje.toLocaleString()

        const chavedeControle = crypto.randomBytes(15).toString('hex');

        const idPlano = req.body.idPlano
        const usuarioLogado = req.headers.userId;


        const recebeDados = await db("usuario")
            .innerJoin("estabelecimento", "usuario.usuario_id","=", "estabelecimento.usuario_id")
            .where("usuario.usuario_id", "=", usuarioLogado)

        const postDataBase = recebeDados[0];


        // Requisição na Pagarme para criar a assinatura
        let erroPagarme = ''
        await pagarme.client.connect({
                api_key: authConfig.keyApi
            })
            .then(client => client.subscriptions.create({
                plan_id: idPlano,
                payment_method: 'boleto',
                reference_key: chavedeControle,
                metadata: {
                    nome_fantasia: postDataBase.nome_fantasia,
                    tipo_atividade: postDataBase.tipo_atividade,
                    id_usuario: usuarioLogado

                },
                postback_url: 'https://app-30762.nuvem-us-04.absamcloud.com/postback',
                boleto_instructions: '*** Não receber após o vencimento ***',
                customer: {
                    external_id: usuarioLogado,
                    email: postDataBase.email,
                    name: postDataBase.nome,
                    document_number: postDataBase.cpf,
                    address: {
                        zipcode: postDataBase.cep,
                        neighborhood: postDataBase.bairro,
                        street: postDataBase.endereco,
                        street_number: postDataBase.numero
                    },
                    phone: {
                        number: postDataBase.celular_usuario.substring(2),
                        ddd: postDataBase.celular_usuario.substring(0, 2)
                    }
                }

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



        // Se gerar algum erro na criação da assinatura, a variavel erroPagarme será preenchida e seu valor retornado ao front
        if (req.bodySubscription == undefined) {
            return res.status(400).json({ mensagem: erroPagarme[0].message, status: 'error', title: 'Ops!' });

        } else {


            // Variavel insereDados recebe todos os dados para gravar no banco de dados
            const insereDados = {
                cartao_gerado_id: 'NULL',
                plano_id: idPlano,
                data_criacao_cartao: 'NULL',
                nome_portador_cartao: 'NULL',
                ultimos_digitos_cartao_criado: 'NULL',
                valor_plano: req.bodySubscription.plan.amount,
                plano: req.bodySubscription.plan.name,
                metodo_pagamento_plano: req.bodySubscription.plan.payment_methods,
                status_assinatura: "waiting_first_payment",
                codigo_autorizacao: 'NULL',
                nsu: req.bodySubscription.current_transaction.nsu,
                data_transacao: req.bodySubscription.current_transaction.date_created.split('T')[0],
                transacao_id: req.bodySubscription.current_transaction.id,
                metodo_pagamento_utilizado: req.bodySubscription.current_transaction.payment_method,
                assinatura_id: req.bodySubscription.current_transaction.subscription_id,
                chave_referencia: req.bodySubscription.current_transaction.reference_key,
                cliente_pargarme_id: req.bodySubscription.customer.id,
                url_assinatura: req.bodySubscription.manage_url,
                data_registro: dataHoje.toLocaleString(dataHoje.setDate(dataHoje.getDate())),
                link_boleto: req.bodySubscription.current_transaction.boleto_url,
                ultima_atualizacao: dataHoje.toLocaleString(dataHoje.setDate(dataHoje.getDate())),
               
                ultima_acao: "Criação de assinatura com metodo de pagamento boleto"
            }

            //realiza o update, conforme o usuario enviado pelo front na variavel usuarioLogado
            db.update(insereDados).into("assinatura")
                .where("assinatura.usuario_id", "=", usuarioLogado).then(insereDados => {

                    const postData = req.bodySubscription.current_transaction.boleto_url
                    return res.status(200).json({ mensagem: 'Assinatura criada com sucesso!', status: 'success', title: 'Tudo certo!', postData });

                })
                .catch(function(err) {
                    if (err) {
                        console.log("Não foi possível salvar no banco de dados")
                    }
                })
        }
    }
    async credito(req, res, next) {

        var dataHoje = new Date()
        dataHoje.toLocaleString()

        const chavedeControle = crypto.randomBytes(15).toString('hex');

        console.log(req.headers.userId)
        // Variaveis recebidas do front
        const usuarioLogado = req.headers.userId;
        const numeroCartao = req.body.numeroCartao
        const nomeImpressoCartao = req.body.nomeImpressoCartao
        const validadeCartao = req.body.validadeCartao
        const cvvCartao = req.body.cvvCartao
        const idPlano = req.body.idPlano


        const recebeDados = await db("usuario")
            .innerJoin("estabelecimento", "usuario.usuario_id","=", "estabelecimento.usuario_id")
            .where("usuario.usuario_id", "=", usuarioLogado).select("usuario.*","estabelecimento.*","usuario.cpf")

        const postDataBase = recebeDados[0];

        // Requisição na Pagarme para codificar o cartão, e gerar o card_id para criar a assinatura por cartão de crédito
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

        // Requisição na Pagarme para criar a assinatura
        let erroPagarme = ''
        await pagarme.client.connect({
                api_key: authConfig.keyApi
            })
            .then(client => client.subscriptions.create({
                plan_id: idPlano,
                card_id: req.bodyCardid.id,
                payment_method: 'credit_card',
                reference_key: chavedeControle,
                metadata: {
                    nome_fantasia: postDataBase.nome_fantasia,
                    tipo_atividade: postDataBase.tipo_atividade,
                    id_usuario: usuarioLogado

                },
                postback_url: 'https://app-30762.nuvem-us-04.absamcloud.com/postback',
                customer: {
                    external_id: usuarioLogado,
                    email: postDataBase.email,
                    name: postDataBase.nome,
                    document_number: postDataBase.cpf,
                    address: {
                        zipcode: postDataBase.cep,
                        neighborhood: postDataBase.bairro,
                        street: postDataBase.endereco,
                        street_number: postDataBase.numero
                    },
                    phone: {
                        number: postDataBase.celular_usuario.substring(2),
                        ddd: postDataBase.celular_usuario.substring(0, 2)
                    }
                }
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


        // Se gerar algum erro na criação da assinatura, a variavel erroPagarme será preenchida e seu valor retornado ao front
        if (req.bodySubscription == undefined) {
            return res.status(400).json({ mensagem: erroPagarme[0].message, status: 'error', title: 'Ops!' });

        } else {

            // Variavel insereDados recebe todos os dados para gravar no banco de dados
            const insereDados = {
                cartao_gerado_id: req.bodyCardid.id,
                data_criacao_cartao: req.bodyCardid.date_created.split('T')[0],
                nome_portador_cartao: req.bodyCardid.holder_name,
                ultimos_digitos_cartao_criado: req.bodyCardid.last_digits,
                plano_id: req.bodySubscription.plan.id,
                valor_plano: req.bodySubscription.plan.amount,
                plano: req.bodySubscription.plan.name,
                metodo_pagamento_plano: req.bodySubscription.plan.payment_methods,
                status_assinatura: req.bodySubscription.current_transaction.status,
                codigo_autorizacao: req.bodySubscription.current_transaction.authorization_code,
                nsu: req.bodySubscription.current_transaction.nsu,
                data_transacao: req.bodySubscription.current_transaction.date_created.split('T')[0],
                transacao_id: req.bodySubscription.current_transaction.id,
                metodo_pagamento_utilizado: req.bodySubscription.current_transaction.payment_method,
                assinatura_id: req.bodySubscription.current_transaction.subscription_id,
                chave_referencia: req.bodySubscription.current_transaction.reference_key,
                cliente_pargarme_id: req.bodySubscription.customer.id,
                url_assinatura: req.bodySubscription.manage_url,
                data_registro: dataHoje.toLocaleString(dataHoje.setDate(dataHoje.getDate())),
               
                ultima_atualizacao: dataHoje.toLocaleString(dataHoje.setDate(dataHoje.getDate())),
                ultima_acao: "Criação de assinatura com metodo de pagamento boleto"
            }

            //realiza o update, conforme o usuario enviado pelo front na variavel usuarioLogado
            db.update(insereDados).into("assinatura")
                .where("assinatura.usuario_id", "=", usuarioLogado).then(insereDados => {

                    return res.status(200).json({ mensagem: 'Assinatura criada com sucesso!', status: 'success', title: 'Tudo certo!' });

                })
                .catch(function(err) {
                    if (err) {
                        console.log("Não foi possível salvar no banco de dados")
                    }
                })
        }

    }

}