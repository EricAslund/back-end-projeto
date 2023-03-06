import express from 'express';
import pagarme from 'pagarme';
import db from '../database/connection.js';


import crypto from 'crypto';
import authConfig from '../config/auth.js'


export default class TrocaMetodoPagamentoParaBoletoController {

    async showDataBase(req, res, next) {

        var dataHoje = new Date()
        dataHoje.toLocaleString()

        const chavedeControle = crypto.randomBytes(15).toString('hex')
        const usuarioLogado = req.headers.userId;


        const recebeDados = await db("usuario")
        .innerJoin("estabelecimento", "usuario.usuario_id", "estabelecimento.usuario_id")
        .innerJoin("assinatura", "usuario.usuario_id", "assinatura.usuario_id")
        .where("usuario.usuario_id", "=", usuarioLogado)

        const postDataBase = recebeDados[0];
        const postPlano = await db("plano_assinatura").where("id_plano_assinatura", postDataBase.plano_id)
        const postDataBaseMudancaMetodo = postPlano[0];

        // Requisição na Pagarme para criar a assinatura
        let erroPagarme = ''
        await pagarme.client.connect({
                api_key: authConfig.keyApi
            })
            .then(client => client.subscriptions.create({
                plan_id: postDataBaseMudancaMetodo.correlacao,
                payment_method: 'boleto',
                reference_key: chavedeControle,
                metadata: {
                    nome_fantasia: postDataBase.nome_fantasia,
                    tipo_atividade: postDataBase.tipo_atividade,
                    id_usuario: usuarioLogado,
                    id_assinatura_antiga: postDataBase.assinatura_id,
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

                    erroPagarme = err.response
                }
            })

        function showDataSubscription(data) {
            req.bodySubscription = data
        }

        // Se gerar algum erro na criação da assinatura, a variavel erroPagarme será preenchida e seu valor retornado ao front
        if (req.bodySubscription == undefined) {
            return res.status(400).json({ mensagem: erroPagarme, status: 'error', title: 'Ops!' });

        } else {

            //realiza o update, conforme o usuario enviado pelo front na variavel usuarioLogado
            const insereDados = {
                ultima_atualizacao: dataHoje.toLocaleString(dataHoje.setDate(dataHoje.getDate())),
                ultima_acao: "Troca de metodo de pagamento de cartão de crédito para boleto"
            }

            //realiza o update, conforme o usuario enviado pelo front na variavel usuarioLogado
            db.update(insereDados).into("assinatura")
                .where("assinatura.usuario_id", "=", usuarioLogado).then(insereDados => {

                    const postData = req.bodySubscription.current_transaction.boleto_url

                    return res.status(200).json({ mensagem: 'Troca solicitada com sucesso! Pague o boleto antes do vencimento!', status: 'success', title: 'Tudo certo!', postData });

                })
                .catch(function(err) {
                    if (err) {
                        console.log("Não foi possível salvar no banco de dados")
                    }
                })
        }
    }

}