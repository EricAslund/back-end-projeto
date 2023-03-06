

export default function  validaCNPJ(cnpj) {

    cnpj = cnpj.replace(/[^\d]+/g, '');

    if (cnpj == '') return false;

    if (cnpj.length != 14)
        return false;

    // Elimina CNPJs invalidos conhecidos
    if (cnpj == "00000000000000" ||
        cnpj == "11111111111111" ||
        cnpj == "22222222222222" ||
        cnpj == "33333333333333" ||
        cnpj == "44444444444444" ||
        cnpj == "55555555555555" ||
        cnpj == "66666666666666" ||
        cnpj == "77777777777777" ||
        cnpj == "88888888888888" ||
        cnpj == "99999999999999")
        return false;


    let comprimento = cnpj.length - 2
    let numeros = cnpj.substring(0, comprimento);
    let digitoV = cnpj.substring(comprimento);
    let soma = 0;
    let pos = comprimento - 7;
    for (let i = comprimento; i >= 1; i--) {
        soma += numeros.charAt(comprimento - i) * pos--;
        if (pos < 2)
            pos = 9;
    }
    let  resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitoV.charAt(0))
        return false;

    comprimento = comprimento + 1;
    numeros = cnpj.substring(0, comprimento);
    soma = 0;
    pos = comprimento - 7;
    for (let i = comprimento; i >= 1; i--) {
        soma += numeros.charAt(comprimento - i) * pos--;
        if (pos < 2)
            pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitoV.charAt(1))
        return false;

    return true;

}
// var cnpj = "0964272638";

// if (validaCNPJ(cnpj) == false) {
//     alert("CPF erro");

// } else {
//     alert("CPF Okay - ");
// }