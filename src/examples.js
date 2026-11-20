/* Ejemplos por nivel. g = nivel, t = título, d = descripción, e = entrada de muestra, c = código C. */
var EXAMPLES = [
  {
    "g": "Básico",
    "t": "Hola mundo",
    "d": "El programa más corto: muestra un texto.",
    "e": "",
    "c": "#include <stdio.h>\n\nint main() {\n    printf(\"Hola, mundo!\\n\");\n}\n"
  },
  {
    "g": "Básico",
    "t": "Área de un círculo",
    "d": "Lee un número con decimales y calcula con una fórmula.",
    "e": "2.5\n",
    "c": "#include <stdio.h>\n\nint main() {\n    float RADIO, AREA;\n\n    printf(\"Radio: \");\n    scanf(\"%f\", &RADIO);\n\n    AREA = 3.14159 * RADIO * RADIO;\n    printf(\"El área es %.2f\\n\", AREA);\n}\n"
  },
  {
    "g": "Básico",
    "t": "De Celsius a Fahrenheit",
    "d": "Una conversión de unidades con float.",
    "e": "36.5\n",
    "c": "#include <stdio.h>\n\nint main() {\n    float CELSIUS, FAHRENHEIT;\n\n    printf(\"Temperatura en grados Celsius: \");\n    scanf(\"%f\", &CELSIUS);\n\n    FAHRENHEIT = CELSIUS * 9 / 5 + 32;\n    printf(\"%.1f C equivalen a %.1f F\\n\", CELSIUS, FAHRENHEIT);\n}\n"
  },
  {
    "g": "Básico",
    "t": "División entera y resto",
    "d": "Por qué 7 / 2 da 3 y cómo se obtiene el resto con %.",
    "e": "",
    "c": "#include <stdio.h>\n\nint main() {\n    printf(\"7 / 2   = %d\\n\", 7 / 2);\n    printf(\"7 %% 2   = %d\\n\", 7 % 2);\n    printf(\"7 / 2.0 = %.2f\\n\", 7 / 2.0);\n    printf(\"-7 / 2  = %d\\n\", -7 / 2);\n    printf(\"-7 %% 2  = %d\\n\", -7 % 2);\n}\n"
  },
  {
    "g": "Básico",
    "t": "Cambio en billetes",
    "d": "Usa / y % para repartir un monto en billetes.",
    "e": "380\n",
    "c": "#include <stdio.h>\n\nint main() {\n    int MONTO, B100, B50, B10, RESTO;\n\n    printf(\"Monto: \");\n    scanf(\"%d\", &MONTO);\n\n    B100 = MONTO / 100;\n    RESTO = MONTO % 100;\n    B50 = RESTO / 50;\n    RESTO = RESTO % 50;\n    B10 = RESTO / 10;\n    RESTO = RESTO % 10;\n\n    printf(\"Billetes de 100: %d\\n\", B100);\n    printf(\"Billetes de 50:  %d\\n\", B50);\n    printf(\"Billetes de 10:  %d\\n\", B10);\n    printf(\"Sobran:          %d\\n\", RESTO);\n}\n"
  },
  {
    "g": "Básico",
    "t": "Comparaciones y lógicos",
    "d": "Cada comparación vale 1 (verdadero) o 0 (falso).",
    "e": "",
    "c": "#include <stdio.h>\n\nint main() {\n    int A, B;\n\n    A = 5;\n    B = 8;\n\n    printf(\"A > B          -> %d\\n\", A > B);\n    printf(\"A != B         -> %d\\n\", A != B);\n    printf(\"A < B && B < 10 -> %d\\n\", A < B && B < 10);\n    printf(\"A > B || B == 8 -> %d\\n\", A > B || B == 8);\n    printf(\"!(A == 5)      -> %d\\n\", !(A == 5));\n}\n"
  },
  {
    "g": "Básico",
    "t": "Formatos de printf",
    "d": "Ancho, relleno con ceros, alineación y decimales.",
    "e": "",
    "c": "#include <stdio.h>\n\nint main() {\n    int N;\n    float X;\n\n    N = 42;\n    X = 3.14159f;\n\n    printf(\"[%d]\\n\", N);\n    printf(\"[%5d]\\n\", N);\n    printf(\"[%-5d]\\n\", N);\n    printf(\"[%05d]\\n\", N);\n    printf(\"[%f]\\n\", X);\n    printf(\"[%.2f]\\n\", X);\n    printf(\"[%8.3f]\\n\", X);\n    printf(\"[%c]\\n\", 'A');\n}\n"
  },
  {
    "g": "Básico",
    "t": "Tabla de cuadrados y cubos",
    "d": "Columnas alineadas con un for y anchos en printf.",
    "e": "",
    "c": "#include <stdio.h>\n\nint main() {\n    int i;\n\n    printf(\" N  cuadrado  cubo\\n\");\n    for (i = 1; i <= 8; i++) {\n        printf(\"%2d %8d %6d\\n\", i, i * i, i * i * i);\n    }\n}\n"
  },
  {
    "g": "Medio",
    "t": "Precio con descuento",
    "d": "Un if simple: descuento del 10 % desde 1000.",
    "e": "1500\n",
    "c": "#include <stdio.h>\n\nint main() {\n    float TOTAL, DESCUENTO;\n\n    DESCUENTO = 0;\n    printf(\"Total de la compra: \");\n    scanf(\"%f\", &TOTAL);\n\n    if (TOTAL >= 1000) {\n        DESCUENTO = TOTAL * 0.10;\n    }\n\n    printf(\"Descuento: %.2f\\n\", DESCUENTO);\n    printf(\"A pagar:   %.2f\\n\", TOTAL - DESCUENTO);\n}\n"
  },
  {
    "g": "Medio",
    "t": "Tipo de triángulo",
    "d": "if / else if con varias condiciones.",
    "e": "5 5 8\n",
    "c": "#include <stdio.h>\n\nint main() {\n    int A, B, C;\n\n    printf(\"Los tres lados: \");\n    scanf(\"%d %d %d\", &A, &B, &C);\n\n    if (A == B && B == C) {\n        printf(\"Equilátero\\n\");\n    } else if (A == B || B == C || A == C) {\n        printf(\"Isósceles\\n\");\n    } else {\n        printf(\"Escaleno\\n\");\n    }\n}\n"
  },
  {
    "g": "Medio",
    "t": "Categoría por edad",
    "d": "Una cadena de else if que se corta en la primera verdadera.",
    "e": "16\n",
    "c": "#include <stdio.h>\n\nint main() {\n    int EDAD;\n\n    printf(\"Edad: \");\n    scanf(\"%d\", &EDAD);\n\n    if (EDAD < 12) {\n        printf(\"Niño o niña\\n\");\n    } else if (EDAD < 18) {\n        printf(\"Adolescente\\n\");\n    } else if (EDAD < 65) {\n        printf(\"Adulto o adulta\\n\");\n    } else {\n        printf(\"Persona mayor\\n\");\n    }\n}\n"
  },
  {
    "g": "Medio",
    "t": "Calculadora con switch",
    "d": "switch con char y un caso que evita dividir por cero.",
    "e": "12 * 4\n",
    "c": "#include <stdio.h>\n\nint main() {\n    float A, B;\n    char OP;\n\n    printf(\"Cuenta (por ejemplo 12 * 4): \");\n    scanf(\"%f %c %f\", &A, &OP, &B);\n\n    switch (OP) {\n        case '+': printf(\"%.2f\\n\", A + B); break;\n        case '-': printf(\"%.2f\\n\", A - B); break;\n        case '*': printf(\"%.2f\\n\", A * B); break;\n        case '/':\n            if (B == 0) { printf(\"No se puede dividir por cero\\n\"); }\n            else { printf(\"%.2f\\n\", A / B); }\n            break;\n        default: printf(\"Operación desconocida\\n\");\n    }\n}\n"
  },
  {
    "g": "Medio",
    "t": "Cuenta regresiva",
    "d": "for que cuenta hacia atrás.",
    "e": "5\n",
    "c": "#include <stdio.h>\n\nint main() {\n    int N, i;\n\n    printf(\"Desde: \");\n    scanf(\"%d\", &N);\n\n    for (i = N; i >= 1; i--) {\n        printf(\"%d\\n\", i);\n    }\n    printf(\"Despegue!\\n\");\n}\n"
  },
  {
    "g": "Medio",
    "t": "Suma de los dígitos",
    "d": "while con / y % para separar cifras.",
    "e": "4825\n",
    "c": "#include <stdio.h>\n\nint main() {\n    int N, SUMA;\n\n    SUMA = 0;\n    printf(\"Número: \");\n    scanf(\"%d\", &N);\n\n    while (N > 0) {\n        SUMA = SUMA + N % 10;\n        N = N / 10;\n    }\n    printf(\"La suma de los dígitos es %d\\n\", SUMA);\n}\n"
  },
  {
    "g": "Medio",
    "t": "Potencias de 2 hasta 1000",
    "d": "while con una condición sobre el valor que crece.",
    "e": "",
    "c": "#include <stdio.h>\n\nint main() {\n    int P;\n\n    P = 1;\n    while (P <= 1000) {\n        printf(\"%d \", P);\n        P = P * 2;\n    }\n    printf(\"\\n\");\n}\n"
  },
  {
    "g": "Medio",
    "t": "Sumar hasta el cero",
    "d": "Lazo condicional con lectura adelantada: termina cuando se lee 0.",
    "e": "10\n20\n5\n0\n",
    "c": "#include <stdio.h>\n\nint main() {\n    int V, SUMA;\n\n    SUMA = 0;\n    printf(\"Número (0 para terminar): \");\n    scanf(\"%d\", &V);\n    while (V != 0) {\n        SUMA = SUMA + V;\n        printf(\"Número (0 para terminar): \");\n        scanf(\"%d\", &V);\n    }\n\n    printf(\"Suma total: %d\\n\", SUMA);\n}\n"
  },
  {
    "g": "Medio",
    "t": "Ahorro año a año",
    "d": "for que acumula un resultado en cada vuelta.",
    "e": "1000\n",
    "c": "#include <stdio.h>\n\nint main() {\n    float CAPITAL;\n    int ANIO;\n\n    printf(\"Capital inicial: \");\n    scanf(\"%f\", &CAPITAL);\n\n    for (ANIO = 1; ANIO <= 5; ANIO++) {\n        CAPITAL = CAPITAL * 1.05;\n        printf(\"Año %d: %.2f\\n\", ANIO, CAPITAL);\n    }\n}\n"
  },
  {
    "g": "Medio",
    "t": "Función con retorno",
    "d": "Prototipo, definición y llamada de una función.",
    "e": "6 4\n",
    "c": "#include <stdio.h>\n\nint AREA(int BASE, int ALTURA);\n\nint main() {\n    int B, H;\n\n    printf(\"Base y altura: \");\n    scanf(\"%d %d\", &B, &H);\n\n    printf(\"El área es %d\\n\", AREA(B, H));\n}\n\nint AREA(int BASE, int ALTURA) {\n    return BASE * ALTURA;\n}\n"
  },
  {
    "g": "Medio",
    "t": "Función sin retorno (void)",
    "d": "Una función que imprime y no devuelve nada.",
    "e": "10\n",
    "c": "#include <stdio.h>\n\nvoid LINEA(int LARGO);\n\nint main() {\n    int N;\n\n    printf(\"Largo de la línea: \");\n    scanf(\"%d\", &N);\n\n    LINEA(N);\n    printf(\" Editor C \\n\");\n    LINEA(N);\n}\n\nvoid LINEA(int LARGO) {\n    int i;\n    for (i = 0; i < LARGO; i++) {\n        printf(\"*\");\n    }\n    printf(\"\\n\");\n}\n"
  },
  {
    "g": "Medio",
    "t": "Factorial (recursión)",
    "d": "Una función que se llama a sí misma.",
    "e": "5\n",
    "c": "#include <stdio.h>\n\nlong FACTORIAL(int N);\n\nint main() {\n    int N;\n\n    printf(\"Número: \");\n    scanf(\"%d\", &N);\n\n    printf(\"%d! = %ld\\n\", N, FACTORIAL(N));\n}\n\nlong FACTORIAL(int N) {\n    if (N <= 1) {\n        return 1;\n    }\n    return N * FACTORIAL(N - 1);\n}\n"
  },
  {
    "g": "Medio",
    "t": "Suma de impares",
    "d": "Una función con un for adentro.",
    "e": "5\n",
    "c": "#include <stdio.h>\n\nint SUMAIMPARES(int CANTIDAD);\n\nint main() {\n    int N;\n\n    printf(\"Cuántos impares: \");\n    scanf(\"%d\", &N);\n\n    printf(\"La suma de los primeros %d impares es %d\\n\", N, SUMAIMPARES(N));\n}\n\nint SUMAIMPARES(int CANTIDAD) {\n    int SUMA, IMPAR, i;\n    SUMA = 0;\n    IMPAR = 1;\n    for (i = 0; i < CANTIDAD; i++) {\n        SUMA = SUMA + IMPAR;\n        IMPAR = IMPAR + 2;\n    }\n    return SUMA;\n}\n"
  },
  {
    "g": "Medio",
    "t": "Temperaturas sobre el promedio",
    "d": "Un arreglo de float y dos recorridos con for.",
    "e": "21.5 19 25 30.5 18\n",
    "c": "#include <stdio.h>\n\nint main() {\n    float T[5], SUMA, PROMEDIO;\n    int i, CANT;\n\n    SUMA = 0;\n    CANT = 0;\n    printf(\"Cinco temperaturas: \");\n    for (i = 0; i < 5; i++) {\n        scanf(\"%f\", &T[i]);\n        SUMA = SUMA + T[i];\n    }\n    PROMEDIO = SUMA / 5;\n\n    for (i = 0; i < 5; i++) {\n        if (T[i] > PROMEDIO) {\n            CANT++;\n        }\n    }\n    printf(\"Promedio: %.2f\\n\", PROMEDIO);\n    printf(\"Superan el promedio: %d\\n\", CANT);\n}\n"
  },
  {
    "g": "Medio",
    "t": "Invertir un arreglo",
    "d": "Recorrer un arreglo de atrás hacia adelante.",
    "e": "1 2 3 4 5 6\n",
    "c": "#include <stdio.h>\n\nint main() {\n    int V[6], i;\n\n    printf(\"Seis números: \");\n    for (i = 0; i < 6; i++) {\n        scanf(\"%d\", &V[i]);\n    }\n\n    printf(\"Al revés: \");\n    for (i = 5; i >= 0; i--) {\n        printf(\"%d \", V[i]);\n    }\n    printf(\"\\n\");\n}\n"
  },
  {
    "g": "Medio",
    "t": "Contar vocales",
    "d": "Un texto es un arreglo de char terminado en cero.",
    "e": "Hola mundo de C\n",
    "c": "#include <stdio.h>\n#include <ctype.h>\n\nint main() {\n    char TEXTO[80];\n    int i, VOCALES;\n\n    VOCALES = 0;\n    printf(\"Escribe una frase: \");\n    fgets(TEXTO, 80, stdin);\n\n    for (i = 0; TEXTO[i] != '\\0'; i++) {\n        switch (tolower(TEXTO[i])) {\n            case 'a': case 'e': case 'i': case 'o': case 'u':\n                VOCALES++;\n        }\n    }\n    printf(\"Tiene %d vocales\\n\", VOCALES);\n}\n"
  },
  {
    "g": "Medio",
    "t": "Largo y mayúsculas",
    "d": "strlen y toupper sobre un texto leído con scanf.",
    "e": "editor\n",
    "c": "#include <stdio.h>\n#include <string.h>\n#include <ctype.h>\n\nint main() {\n    char PALABRA[30];\n    int i;\n\n    printf(\"Una palabra: \");\n    scanf(\"%29s\", PALABRA);\n\n    printf(\"Tiene %zu letras\\n\", strlen(PALABRA));\n    for (i = 0; PALABRA[i] != '\\0'; i++) {\n        PALABRA[i] = toupper(PALABRA[i]);\n    }\n    printf(\"En mayúsculas: %s\\n\", PALABRA);\n}\n"
  },
  {
    "g": "Medio",
    "t": "Hipotenusa",
    "d": "sqrt y pow de math.h.",
    "e": "3 4\n",
    "c": "#include <stdio.h>\n#include <math.h>\n\nint main() {\n    float A, B, H;\n\n    printf(\"Los dos catetos: \");\n    scanf(\"%f %f\", &A, &B);\n\n    H = sqrt(pow(A, 2) + pow(B, 2));\n    printf(\"La hipotenusa mide %.2f\\n\", H);\n}\n"
  },
  {
    "g": "Medio",
    "t": "Redondeos",
    "d": "floor, ceil y fabs sobre el mismo número.",
    "e": "",
    "c": "#include <stdio.h>\n#include <math.h>\n\nint main() {\n    float X;\n\n    X = -3.7f;\n\n    printf(\"X        = %.1f\\n\", X);\n    printf(\"floor(X) = %.1f\\n\", floor(X));\n    printf(\"ceil(X)  = %.1f\\n\", ceil(X));\n    printf(\"fabs(X)  = %.1f\\n\", fabs(X));\n}\n"
  },
  {
    "g": "Práctica · errores",
    "t": "Error: falta un ;",
    "d": "No compila: encuentra la línea.",
    "e": "",
    "c": "#include <stdio.h>\n\nint main() {\n    int A = 5\n    printf(\"%d\\n\", A);\n}\n"
  },
  {
    "g": "Práctica · errores",
    "t": "Error: scanf sin &",
    "d": "No compila en el editor: ¿qué le falta a scanf?",
    "e": "",
    "c": "#include <stdio.h>\n\nint main() {\n    int A;\n\n    scanf(\"%d\", A);\n    printf(\"%d\\n\", A);\n}\n"
  },
  {
    "g": "Práctica · errores",
    "t": "Aviso: = dentro de un if",
    "d": "Compila con aviso: ¿por qué siempre dice tres?",
    "e": "",
    "c": "#include <stdio.h>\n\nint main() {\n    int A;\n\n    A = 5;\n\n    if (A = 3) printf(\"tres\\n\");\n    else printf(\"otro\\n\");\n}\n"
  },
  {
    "g": "Práctica · errores",
    "t": "Aviso: if con ; al final",
    "d": "Compila, pero el if no hace lo que parece.",
    "e": "-3\n",
    "c": "#include <stdio.h>\n\nint main() {\n    int A;\n\n    scanf(\"%d\", &A);\n    if (A > 0);\n        printf(\"positivo\\n\");\n}\n"
  },
  {
    "g": "Básico",
    "t": "Control de consumo eléctrico",
    "d": "Nivel básico · lee cuatro consumos, valida valores, calcula costos y obtiene un promedio con contador y acumulador.",
    "e": "8\n12\n5\n15\n",
    "c": "#include <stdio.h>\n\nint main() {\n    int i, CONSUMO, TOTAL, DIAS_ALTOS, CANTIDAD;\n    float PRECIO, COSTO, PROMEDIO;\n\n    TOTAL = 0;\n    DIAS_ALTOS = 0;\n    CANTIDAD = 0;\n    PRECIO = 12.50;\n\n    printf(\"Consumo de cuatro días\\n\");\n    for (i = 1; i <= 4; i++) {\n        printf(\"Día %d, kWh: \", i);\n        scanf(\"%d\", &CONSUMO);\n\n        if (CONSUMO < 0) {\n            printf(\"Dato inválido\\n\");\n        } else {\n            COSTO = CONSUMO * PRECIO;\n            TOTAL = TOTAL + CONSUMO;\n            CANTIDAD = CANTIDAD + 1;\n            if (CONSUMO >= 10) {\n                DIAS_ALTOS = DIAS_ALTOS + 1;\n            }\n            printf(\"Costo: $%.2f\\n\", COSTO);\n        }\n    }\n\n    if (CANTIDAD > 0) {\n        PROMEDIO = TOTAL / (CANTIDAD * 1.0);\n        printf(\"Consumo total: %d kWh\\n\", TOTAL);\n        printf(\"Promedio: %.2f kWh\\n\", PROMEDIO);\n        printf(\"Días de 10 kWh o más: %d\\n\", DIAS_ALTOS);\n    } else {\n        printf(\"No hay datos válidos\\n\");\n    }\n}"
  },
  {
    "g": "Básico",
    "t": "Duración en horas, minutos y segundos",
    "d": "Nivel básico · separa una cantidad de segundos usando división entera y resto, con validación de entrada.",
    "e": "7384\n",
    "c": "#include <stdio.h>\n\nint main() {\n    int TOTAL, HORAS, MINUTOS, SEGUNDOS, RESTO, MINUTOS_TOTALES;\n\n    printf(\"Duración total en segundos: \");\n    scanf(\"%d\", &TOTAL);\n\n    if (TOTAL < 0) {\n        printf(\"La duración no puede ser negativa\\n\");\n    } else {\n        /* La división entera obtiene las horas completas. */\n        HORAS = TOTAL / 3600;\n        RESTO = TOTAL % 3600;\n        MINUTOS = RESTO / 60;\n        SEGUNDOS = RESTO % 60;\n        MINUTOS_TOTALES = TOTAL / 60;\n\n        printf(\"Minutos totales: %d\\n\", MINUTOS_TOTALES);\n        printf(\"Días completos: %d\\n\", TOTAL / 86400);\n        printf(\"Horas: %d\\n\", HORAS);\n        printf(\"Minutos: %d\\n\", MINUTOS);\n        printf(\"Segundos: %d\\n\", SEGUNDOS);\n        /* Estos datos permiten revisar la conversión completa. */\n        printf(\"Segundos ingresados: %d\\n\", TOTAL);\n        printf(\"Resto luego de las horas: %d\\n\", RESTO);\n        printf(\"Una hora contiene 3600 segundos\\n\");\n        printf(\"Formato: %02d:%02d:%02d\\n\", HORAS, MINUTOS, SEGUNDOS);\n    }\n}"
  },
  {
    "g": "Básico",
    "t": "Tabla de conversión de kilómetros",
    "d": "Nivel básico · valida un intervalo y genera una tabla de kilómetros y millas con for y printf alineado.",
    "e": "0 10 2\n",
    "c": "#include <stdio.h>\n\nint main() {\n    float DESDE, HASTA, PASO, KM, MILLAS;\n    int CANTIDAD;\n\n    printf(\"Inicio, final y paso en km: \");\n    scanf(\"%f %f %f\", &DESDE, &HASTA, &PASO);\n\n    if (PASO <= 0 || DESDE > HASTA) {\n        printf(\"Intervalo no válido\\n\");\n    } else {\n        /* El paso debe ser positivo para que el for avance. */\n        CANTIDAD = 0;\n        printf(\"Kilómetros      Millas\\n\");\n        printf(\"----------------------\\n\");\n\n        for (KM = DESDE; KM <= HASTA; KM = KM + PASO) {\n            MILLAS = KM * 0.621371;\n            printf(\"%10.2f %12.2f\\n\", KM, MILLAS);\n            CANTIDAD = CANTIDAD + 1;\n        }\n\n        printf(\"Filas generadas: %d\\n\", CANTIDAD);\n        /* El informe conserva los límites del intervalo. */\n        printf(\"Factor de conversión: 0.621371\\n\");\n        printf(\"Paso utilizado: %.2f km\\n\", PASO);\n        printf(\"Primera distancia: %.2f km\\n\", DESDE);\n        printf(\"Última distancia: %.2f km\\n\", KM - PASO);\n    }\n}"
  },
  {
    "g": "Medio",
    "t": "Estadísticas de temperaturas",
    "d": "Nivel medio · carga un arreglo, valida cada dato y calcula promedio, máximo, mínimo y cantidad de días cálidos.",
    "e": "18.5\n21\n31.5\n12\n27\n",
    "c": "#include <stdio.h>\n\nint main() {\n    float TEMP[5], SUMA, PROMEDIO, MAXIMO, MINIMO;\n    int i, CALIDOS;\n\n    SUMA = 0;\n    CALIDOS = 0;\n\n    for (i = 0; i < 5; i++) {\n        printf(\"Temperatura %d: \", i + 1);\n        scanf(\"%f\", &TEMP[i]);\n        while (TEMP[i] < -20 || TEMP[i] > 50) {\n            printf(\"Fuera del rango. Ingresa otra temperatura: \");\n            scanf(\"%f\", &TEMP[i]);\n        }\n        SUMA = SUMA + TEMP[i];\n        if (TEMP[i] >= 25) {\n            CALIDOS = CALIDOS + 1;\n        }\n    }\n\n    MAXIMO = TEMP[0];\n    MINIMO = TEMP[0];\n    for (i = 1; i < 5; i++) {\n        if (TEMP[i] > MAXIMO) MAXIMO = TEMP[i];\n        if (TEMP[i] < MINIMO) MINIMO = TEMP[i];\n    }\n\n    PROMEDIO = SUMA / 5.0;\n    printf(\"Promedio: %.2f\\n\", PROMEDIO);\n    printf(\"Máxima: %.2f\\n\", MAXIMO);\n    printf(\"Mínima: %.2f\\n\", MINIMO);\n    printf(\"Días cálidos: %d\\n\", CALIDOS);\n}"
  },
  {
    "g": "Medio",
    "t": "Encuesta de medios de transporte",
    "d": "Nivel medio · registra cinco respuestas con while y switch, valida opciones y cuenta cada elección.",
    "e": "1\n2\n1\n4\n3\n",
    "c": "#include <stdio.h>\n\nint main() {\n    int RESPUESTA, CARGADAS, INVALIDAS;\n    int COLECTIVO, TREN, BICICLETA, CAMINANDO;\n\n    CARGADAS = 0;\n    INVALIDAS = 0;\n    COLECTIVO = 0;\n    TREN = 0;\n    BICICLETA = 0;\n    CAMINANDO = 0;\n\n    while (CARGADAS < 5) {\n        printf(\"1 Colectivo  2 Tren  3 Bicicleta  4 Caminando\\n\");\n        printf(\"Respuesta %d: \", CARGADAS + 1);\n        scanf(\"%d\", &RESPUESTA);\n\n        switch (RESPUESTA) {\n            case 1: COLECTIVO = COLECTIVO + 1; CARGADAS = CARGADAS + 1; break;\n            case 2: TREN = TREN + 1; CARGADAS = CARGADAS + 1; break;\n            case 3: BICICLETA = BICICLETA + 1; CARGADAS = CARGADAS + 1; break;\n            case 4: CAMINANDO = CAMINANDO + 1; CARGADAS = CARGADAS + 1; break;\n            default: INVALIDAS = INVALIDAS + 1; printf(\"Opción no válida\\n\");\n        }\n    }\n\n    printf(\"\\nResultados de la encuesta\\n\");\n    printf(\"Colectivo: %d\\n\", COLECTIVO);\n    printf(\"Tren: %d\\n\", TREN);\n    printf(\"Bicicleta: %d\\n\", BICICLETA);\n    printf(\"Caminando: %d\\n\", CAMINANDO);\n    printf(\"Respuestas inválidas: %d\\n\", INVALIDAS);\n}"
  },
  {
    "g": "Medio",
    "t": "Resumen de ventas de la semana",
    "d": "Nivel medio · procesa un arreglo de siete ventas y construye una tabla con total, promedio y extremos.",
    "e": "120\n90\n150\n80\n200\n170\n110\n",
    "c": "#include <stdio.h>\n\nint main() {\n    float VENTA[7], TOTAL, PROMEDIO, MAXIMO, MINIMO;\n    int i, ALTAS;\n\n    TOTAL = 0;\n    ALTAS = 0;\n    printf(\"Ventas de los siete días\\n\");\n\n    for (i = 0; i < 7; i++) {\n        printf(\"Día %d: \", i + 1);\n        scanf(\"%f\", &VENTA[i]);\n        while (VENTA[i] < 0) {\n            printf(\"La venta no puede ser negativa: \");\n            scanf(\"%f\", &VENTA[i]);\n        }\n        TOTAL = TOTAL + VENTA[i];\n        if (VENTA[i] >= 150) ALTAS = ALTAS + 1;\n    }\n\n    MAXIMO = VENTA[0];\n    MINIMO = VENTA[0];\n    for (i = 1; i < 7; i++) {\n        if (VENTA[i] > MAXIMO) MAXIMO = VENTA[i];\n        if (VENTA[i] < MINIMO) MINIMO = VENTA[i];\n    }\n\n    PROMEDIO = TOTAL / 7.0;\n    printf(\"\\nResumen semanal\\n\");\n    printf(\"Total: $%.2f\\n\", TOTAL);\n    printf(\"Promedio diario: $%.2f\\n\", PROMEDIO);\n    printf(\"Mayor venta: $%.2f\\n\", MAXIMO);\n    printf(\"Menor venta: $%.2f\\n\", MINIMO);\n    printf(\"Días con ventas de $150 o más: %d\\n\", ALTAS);\n}"
  },
  {
    "g": "Completo",
    "t": "Caja de tienda con menú y funciones",
    "d": "Nivel completo · permite registrar ventas, consultar el resumen y salir mediante un menú con while, switch y funciones relacionadas.",
    "e": "1\n2\n150.5\n2\n3\n",
    "c": "#include <stdio.h>\n\nfloat CALCULAR_SUBTOTAL(int CANTIDAD, float PRECIO);\nfloat CALCULAR_TOTAL(float SUBTOTAL);\nvoid MOSTRAR_RESUMEN(int UNIDADES, float SUBTOTAL);\n\nint main() {\n    int OPCION, CANTIDAD, UNIDADES;\n    float PRECIO, SUBTOTAL, IMPORTE;\n\n    OPCION = 0;\n    UNIDADES = 0;\n    SUBTOTAL = 0;\n\n    while (OPCION != 3) {\n        printf(\"\\n1 Registrar venta\\n2 Ver resumen\\n3 Salir\\n\");\n        printf(\"Opción: \");\n        scanf(\"%d\", &OPCION);\n\n        switch (OPCION) {\n            case 1:\n                printf(\"Cantidad y precio unitario: \");\n                scanf(\"%d %f\", &CANTIDAD, &PRECIO);\n                if (CANTIDAD > 0 && PRECIO >= 0) {\n                    IMPORTE = CALCULAR_SUBTOTAL(CANTIDAD, PRECIO);\n                    SUBTOTAL = SUBTOTAL + IMPORTE;\n                    UNIDADES = UNIDADES + CANTIDAD;\n                    printf(\"Venta agregada: $%.2f\\n\", IMPORTE);\n                } else {\n                    printf(\"Datos no válidos\\n\");\n                }\n                break;\n            case 2:\n                MOSTRAR_RESUMEN(UNIDADES, SUBTOTAL);\n                break;\n            case 3:\n                printf(\"Cierre de caja\\n\");\n                break;\n            default:\n                printf(\"Opción inexistente\\n\");\n        }\n    }\n}\n\nfloat CALCULAR_SUBTOTAL(int CANTIDAD, float PRECIO) {\n    return CANTIDAD * PRECIO;\n}\n\nfloat CALCULAR_TOTAL(float SUBTOTAL) {\n    return SUBTOTAL * 1.21;\n}\n\nvoid MOSTRAR_RESUMEN(int UNIDADES, float SUBTOTAL) {\n    float TOTAL;\n    TOTAL = CALCULAR_TOTAL(SUBTOTAL);\n    printf(\"Unidades vendidas: %d\\n\", UNIDADES);\n    printf(\"Subtotal: $%.2f\\n\", SUBTOTAL);\n    printf(\"Total con impuesto: $%.2f\\n\", TOTAL);\n}"
  },
  {
    "g": "Completo",
    "t": "Producción por turnos con matriz y funciones",
    "d": "Nivel completo · carga una matriz de tres turnos y cuatro días; funciones calculan totales y encuentran el turno de mayor producción.",
    "e": "5 7 6 8\n4 9 10 7\n8 8 8 8\n",
    "c": "#include <stdio.h>\n\n#define TURNOS 3\n#define DIAS 4\n\nint TOTAL_TURNO(int PRODUCCION[][DIAS], int FILA);\nint TURNO_MAYOR(int PRODUCCION[][DIAS]);\n\nint main() {\n    int PRODUCCION[TURNOS][DIAS];\n    int i, j, TOTAL;\n\n    printf(\"Producción por turno y día\\n\");\n    for (i = 0; i < TURNOS; i++) {\n        printf(\"Turno %d: \", i + 1);\n        for (j = 0; j < DIAS; j++) {\n            scanf(\"%d\", &PRODUCCION[i][j]);\n        }\n    }\n\n    printf(\"\\nTotales por turno\\n\");\n    for (i = 0; i < TURNOS; i++) {\n        TOTAL = TOTAL_TURNO(PRODUCCION, i);\n        printf(\"Turno %d: %d unidades\\n\", i + 1, TOTAL);\n    }\n\n    printf(\"Turno con mayor producción: %d\\n\", TURNO_MAYOR(PRODUCCION));\n}\n\nint TOTAL_TURNO(int PRODUCCION[][DIAS], int FILA) {\n    int j, TOTAL;\n    TOTAL = 0;\n    for (j = 0; j < DIAS; j++) {\n        TOTAL = TOTAL + PRODUCCION[FILA][j];\n    }\n    return TOTAL;\n}\n\nint TURNO_MAYOR(int PRODUCCION[][DIAS]) {\n    int i, MAYOR, ACTUAL, POSICION;\n    MAYOR = TOTAL_TURNO(PRODUCCION, 0);\n    POSICION = 1;\n    for (i = 1; i < TURNOS; i++) {\n        ACTUAL = TOTAL_TURNO(PRODUCCION, i);\n        if (ACTUAL > MAYOR) {\n            MAYOR = ACTUAL;\n            POSICION = i + 1;\n        }\n    }\n    return POSICION;\n}"
  },
  {
    "g": "Completo",
    "t": "Juego de preguntas con puntaje",
    "d": "Nivel completo · cuatro preguntas, selección con switch, validación de respuestas y funciones que separan la pregunta del resultado.",
    "e": "2\n3\n2\n1\n",
    "c": "#include <stdio.h>\n\nint PREGUNTAR(int NUMERO);\nvoid MOSTRAR_RESULTADO(int PUNTOS);\n\nint main() {\n    int i, PUNTOS, CORRECTA;\n    PUNTOS = 0;\n\n    printf(\"Juego de preguntas\\n\");\n    for (i = 1; i <= 4; i++) {\n        CORRECTA = PREGUNTAR(i);\n        if (CORRECTA == 1) {\n            printf(\"Respuesta correcta\\n\\n\");\n            PUNTOS = PUNTOS + 1;\n        } else {\n            printf(\"Respuesta incorrecta\\n\\n\");\n        }\n    }\n\n    MOSTRAR_RESULTADO(PUNTOS);\n}\n\nint PREGUNTAR(int NUMERO) {\n    int RESPUESTA;\n    switch (NUMERO) {\n        case 1: printf(\"¿Cuánto es 2 + 2? 1) 3  2) 4  3) 5\\n\"); break;\n        case 2: printf(\"¿Cuánto es 3 * 2? 1) 5  2) 7  3) 6\\n\"); break;\n        case 3: printf(\"¿Qué formato muestra una letra? 1) %%d  2) %%c  3) %%s\\n\"); break;\n        case 4: printf(\"¿Qué instrucción termina un case? 1) break  2) continue  3) scanf\\n\"); break;\n        default: return 0;\n    }\n    printf(\"Respuesta: \");\n    scanf(\"%d\", &RESPUESTA);\n    if ((NUMERO == 1 && RESPUESTA == 2) || (NUMERO == 2 && RESPUESTA == 3) || (NUMERO == 3 && RESPUESTA == 2) || (NUMERO == 4 && RESPUESTA == 1)) {\n        return 1;\n    }\n    return 0;\n}\n\nvoid MOSTRAR_RESULTADO(int PUNTOS) {\n    printf(\"Puntaje final: %d de 4\\n\", PUNTOS);\n    if (PUNTOS == 4) printf(\"Excelente resultado\\n\");\n    else if (PUNTOS >= 2) printf(\"Buen intento\\n\");\n    else printf(\"Sigue practicando\\n\");\n}"
  },
  {
    "g": "Completo",
    "t": "Analizador de texto",
    "d": "Nivel completo · lee una frase y utiliza tres funciones para contar letras, vocales y palabras sin modificar el texto.",
    "e": "C abre puertas\n",
    "c": "#include <stdio.h>\n\nint CONTAR_LETRAS(char TEXTO[]);\nint CONTAR_VOCALES(char TEXTO[]);\nint CONTAR_PALABRAS(char TEXTO[]);\n\nint main() {\n    char TEXTO[100];\n    int LETRAS, VOCALES, PALABRAS;\n\n    printf(\"Escribe una frase: \");\n    fgets(TEXTO, 100, stdin);\n\n    LETRAS = CONTAR_LETRAS(TEXTO);\n    VOCALES = CONTAR_VOCALES(TEXTO);\n    PALABRAS = CONTAR_PALABRAS(TEXTO);\n\n    printf(\"Letras: %d\\n\", LETRAS);\n    printf(\"Vocales: %d\\n\", VOCALES);\n    printf(\"Palabras: %d\\n\", PALABRAS);\n}\n\nint CONTAR_LETRAS(char TEXTO[]) {\n    int i, CANTIDAD;\n    CANTIDAD = 0;\n    for (i = 0; TEXTO[i] != '\\0' && TEXTO[i] != '\\n'; i++) {\n        if ((TEXTO[i] >= 'a' && TEXTO[i] <= 'z') || (TEXTO[i] >= 'A' && TEXTO[i] <= 'Z')) {\n            CANTIDAD = CANTIDAD + 1;\n        }\n    }\n    return CANTIDAD;\n}\n\nint CONTAR_VOCALES(char TEXTO[]) {\n    int i, CANTIDAD;\n    CANTIDAD = 0;\n    for (i = 0; TEXTO[i] != '\\0' && TEXTO[i] != '\\n'; i++) {\n        switch (TEXTO[i]) {\n            case 'a': case 'e': case 'i': case 'o': case 'u':\n            case 'A': case 'E': case 'I': case 'O': case 'U':\n                CANTIDAD = CANTIDAD + 1;\n        }\n    }\n    return CANTIDAD;\n}\n\nint CONTAR_PALABRAS(char TEXTO[]) {\n    int i, CANTIDAD, DENTRO;\n    CANTIDAD = 0;\n    DENTRO = 0;\n    for (i = 0; TEXTO[i] != '\\0' && TEXTO[i] != '\\n'; i++) {\n        if (TEXTO[i] != ' ' && TEXTO[i] != '\\t' && DENTRO == 0) {\n            CANTIDAD = CANTIDAD + 1;\n            DENTRO = 1;\n        } else if (TEXTO[i] == ' ' || TEXTO[i] == '\\t') {\n            DENTRO = 0;\n        }\n    }\n    return CANTIDAD;\n}"
  }
];
