import express from 'express';

import pagarme from 'pagarme';

import db from '../database/connection.js';



import authConfig from '../config/auth.js'









export default class ConsultarAssinaturaController {



    async showDataBase(req, res, next) {





        const usuarioLogado = req.headers.userId



        const recebeDados = await db("assinatura")

            .where("assinatura.usuario_id", "=", usuarioLogado)



        const postDataBase = recebeDados[0];

        

        if(postDataBase.status_assinatura == 'waiting_activate'){

            return res.status(400).json({message: 'Pendente de ativação'})

        }else{

        

        

        //Consulta a assinatura na Pagarme

        await pagarme.client.connect({

                api_key: authConfig.keyApi

            })

            .then(client => client.subscriptions.find({

                id: postDataBase.assinatura_id

            }))

            .then(subscription => showDataSubscription(subscription))

            .catch(function(err) {

                if (err) {

                    

               console.log(err.response)



                }

            })



        function showDataSubscription(data) {

            req.bodySubscription = data

        }





        const postData = req.bodySubscription

        const postDataAtivacao = postDataBase.data_registro

        // const postDataVencimentoAssinatura = postDataBase.vencimento_assinatura



        return res.status(200).json({

            postData,

            postDataAtivacao,

        });

    }

    

    }



}