/* Ejemplos organizados por tema. g = tema, t = título, d = descripción corta, e = datos de entrada de muestra, c = código.
   Ninguno repite un ejercicio de la materia: son problemas distintos que muestran el mismo concepto. Cada uno se compara con gcc en test/ejemplos.js */
var EXAMPLES = [
  { g: 'Primeros pasos', t: 'Hola mundo', d: 'El programa más corto: muestra un texto.', e: '', c: `#include <stdio.h>

int main() {
    printf("Hola, mundo!\\n");
}
` },
  { g: 'Primeros pasos', t: 'Área de un círculo', d: 'Lee un número con decimales y calcula con una fórmula.', e: `2.5
`, c: `#include <stdio.h>

int main() {
    float RADIO, AREA;

    printf("Radio: ");
    scanf("%f", &RADIO);

    AREA = 3.14159 * RADIO * RADIO;
    printf("El área es %.2f\\n", AREA);
}
` },
  { g: 'Primeros pasos', t: 'De Celsius a Fahrenheit', d: 'Una conversión de unidades con float.', e: `36.5
`, c: `#include <stdio.h>

int main() {
    float CELSIUS, FAHRENHEIT;

    printf("Temperatura en grados Celsius: ");
    scanf("%f", &CELSIUS);

    FAHRENHEIT = CELSIUS * 9 / 5 + 32;
    printf("%.1f C equivalen a %.1f F\\n", CELSIUS, FAHRENHEIT);
}
` },
  { g: 'Operadores', t: 'División entera y resto', d: 'Por qué 7 / 2 da 3 y cómo se obtiene el resto con %.', e: '', c: `#include <stdio.h>

int main() {
    printf("7 / 2   = %d\\n", 7 / 2);
    printf("7 %% 2   = %d\\n", 7 % 2);
    printf("7 / 2.0 = %.2f\\n", 7 / 2.0);
    printf("-7 / 2  = %d\\n", -7 / 2);
    printf("-7 %% 2  = %d\\n", -7 % 2);
}
` },
  { g: 'Operadores', t: 'Cambio en billetes', d: 'Usa / y % para repartir un monto en billetes.', e: `380
`, c: `#include <stdio.h>

int main() {
    int MONTO, B100, B50, B10, RESTO;

    printf("Monto: ");
    scanf("%d", &MONTO);

    B100 = MONTO / 100;
    RESTO = MONTO % 100;
    B50 = RESTO / 50;
    RESTO = RESTO % 50;
    B10 = RESTO / 10;
    RESTO = RESTO % 10;

    printf("Billetes de 100: %d\\n", B100);
    printf("Billetes de 50:  %d\\n", B50);
    printf("Billetes de 10:  %d\\n", B10);
    printf("Sobran:          %d\\n", RESTO);
}
` },
  { g: 'Operadores', t: 'Comparaciones y lógicos', d: 'Cada comparación vale 1 (verdadero) o 0 (falso).', e: '', c: `#include <stdio.h>

int main() {
    int A = 5, B = 8;

    printf("A > B          -> %d\\n", A > B);
    printf("A != B         -> %d\\n", A != B);
    printf("A < B && B < 10 -> %d\\n", A < B && B < 10);
    printf("A > B || B == 8 -> %d\\n", A > B || B == 8);
    printf("!(A == 5)      -> %d\\n", !(A == 5));
}
` },
  { g: 'Salida con formato', t: 'Formatos de printf', d: 'Ancho, relleno con ceros, alineación y decimales.', e: '', c: `#include <stdio.h>

int main() {
    int N = 42;
    float X = 3.14159;

    printf("[%d]\\n", N);
    printf("[%5d]\\n", N);
    printf("[%-5d]\\n", N);
    printf("[%05d]\\n", N);
    printf("[%f]\\n", X);
    printf("[%.2f]\\n", X);
    printf("[%8.3f]\\n", X);
    printf("[%c]\\n", 'A');
}
` },
  { g: 'Salida con formato', t: 'Tabla de cuadrados y cubos', d: 'Columnas alineadas con un for y anchos en printf.', e: '', c: `#include <stdio.h>

int main() {
    int I;

    printf(" N  cuadrado  cubo\\n");
    for (I = 1; I <= 8; I++) {
        printf("%2d %8d %6d\\n", I, I * I, I * I * I);
    }
}
` },
  { g: 'Condicionales', t: 'Precio con descuento', d: 'Un if simple: descuento del 10 % desde 1000.', e: `1500
`, c: `#include <stdio.h>

int main() {
    float TOTAL, DESCUENTO = 0;

    printf("Total de la compra: ");
    scanf("%f", &TOTAL);

    if (TOTAL >= 1000) {
        DESCUENTO = TOTAL * 0.10;
    }

    printf("Descuento: %.2f\\n", DESCUENTO);
    printf("A pagar:   %.2f\\n", TOTAL - DESCUENTO);
}
` },
  { g: 'Condicionales', t: 'Tipo de triángulo', d: 'if / else if con varias condiciones.', e: `5 5 8
`, c: `#include <stdio.h>

int main() {
    int A, B, C;

    printf("Los tres lados: ");
    scanf("%d %d %d", &A, &B, &C);

    if (A == B && B == C) {
        printf("Equilátero\\n");
    } else if (A == B || B == C || A == C) {
        printf("Isósceles\\n");
    } else {
        printf("Escaleno\\n");
    }
}
` },
  { g: 'Condicionales', t: 'Categoría por edad', d: 'Una cadena de else if que se corta en la primera verdadera.', e: `16
`, c: `#include <stdio.h>

int main() {
    int EDAD;

    printf("Edad: ");
    scanf("%d", &EDAD);

    if (EDAD < 12) {
        printf("Niño o niña\\n");
    } else if (EDAD < 18) {
        printf("Adolescente\\n");
    } else if (EDAD < 65) {
        printf("Adulto o adulta\\n");
    } else {
        printf("Persona mayor\\n");
    }
}
` },
  { g: 'Condicionales', t: 'Calculadora con switch', d: 'switch con char y un caso que evita dividir por cero.', e: `12 * 4
`, c: `#include <stdio.h>

int main() {
    float A, B;
    char OP;

    printf("Cuenta (por ejemplo 12 * 4): ");
    scanf("%f %c %f", &A, &OP, &B);

    switch (OP) {
        case '+': printf("%.2f\\n", A + B); break;
        case '-': printf("%.2f\\n", A - B); break;
        case '*': printf("%.2f\\n", A * B); break;
        case '/':
            if (B == 0) { printf("No se puede dividir por cero\\n"); }
            else { printf("%.2f\\n", A / B); }
            break;
        default: printf("Operación desconocida\\n");
    }
}
` },
  { g: 'Repetitivas', t: 'Cuenta regresiva', d: 'for que cuenta hacia atrás.', e: `5
`, c: `#include <stdio.h>

int main() {
    int N, I;

    printf("Desde: ");
    scanf("%d", &N);

    for (I = N; I >= 1; I--) {
        printf("%d\\n", I);
    }
    printf("Despegue!\\n");
}
` },
  { g: 'Repetitivas', t: 'Suma de los dígitos', d: 'while con / y % para separar cifras.', e: `4825
`, c: `#include <stdio.h>

int main() {
    int N, SUMA = 0;

    printf("Número: ");
    scanf("%d", &N);

    while (N > 0) {
        SUMA = SUMA + N % 10;
        N = N / 10;
    }
    printf("La suma de los dígitos es %d\\n", SUMA);
}
` },
  { g: 'Repetitivas', t: 'Potencias de 2 hasta 1000', d: 'while con una condición sobre el valor que crece.', e: '', c: `#include <stdio.h>

int main() {
    int P = 1;

    while (P <= 1000) {
        printf("%d ", P);
        P = P * 2;
    }
    printf("\\n");
}
` },
  { g: 'Repetitivas', t: 'Repetir mientras diga s', d: 'do-while: el cuerpo se ejecuta al menos una vez.', e: `10
s
20
s
5
n
`, c: `#include <stdio.h>

int main() {
    int V, SUMA = 0;
    char OTRO;

    do {
        printf("Número: ");
        scanf("%d", &V);
        SUMA = SUMA + V;
        printf("Otro? (s/n): ");
        scanf(" %c", &OTRO);
    } while (OTRO == 's');

    printf("Suma total: %d\\n", SUMA);
}
` },
  { g: 'Repetitivas', t: 'Ahorro año a año', d: 'for que acumula un resultado en cada vuelta.', e: `1000
`, c: `#include <stdio.h>

int main() {
    float CAPITAL;
    int ANIO;

    printf("Capital inicial: ");
    scanf("%f", &CAPITAL);

    for (ANIO = 1; ANIO <= 5; ANIO++) {
        CAPITAL = CAPITAL * 1.05;
        printf("Año %d: %.2f\\n", ANIO, CAPITAL);
    }
}
` },
  { g: 'Funciones', t: 'Función con retorno', d: 'Prototipo, definición y llamada de una función.', e: `6 4
`, c: `#include <stdio.h>

int AREA(int BASE, int ALTURA);

int main() {
    int B, H;

    printf("Base y altura: ");
    scanf("%d %d", &B, &H);

    printf("El área es %d\\n", AREA(B, H));
}

int AREA(int BASE, int ALTURA) {
    return BASE * ALTURA;
}
` },
  { g: 'Funciones', t: 'Función sin retorno (void)', d: 'Una función que imprime y no devuelve nada.', e: `10
`, c: `#include <stdio.h>

void LINEA(int LARGO);

int main() {
    int N;

    printf("Largo de la línea: ");
    scanf("%d", &N);

    LINEA(N);
    printf(" Editor C \\n");
    LINEA(N);
}

void LINEA(int LARGO) {
    int I;
    for (I = 0; I < LARGO; I++) {
        printf("*");
    }
    printf("\\n");
}
` },
  { g: 'Funciones', t: 'Factorial (recursión)', d: 'Una función que se llama a sí misma.', e: `5
`, c: `#include <stdio.h>

long FACTORIAL(int N);

int main() {
    int N;

    printf("Número: ");
    scanf("%d", &N);

    printf("%d! = %ld\\n", N, FACTORIAL(N));
}

long FACTORIAL(int N) {
    if (N <= 1) {
        return 1;
    }
    return N * FACTORIAL(N - 1);
}
` },
  { g: 'Funciones', t: 'Potencia entera', d: 'Una función con un for adentro.', e: `3 4
`, c: `#include <stdio.h>

int POTENCIA(int BASE, int EXPONENTE);

int main() {
    int B, E;

    printf("Base y exponente: ");
    scanf("%d %d", &B, &E);

    printf("%d elevado a %d es %d\\n", B, E, POTENCIA(B, E));
}

int POTENCIA(int BASE, int EXPONENTE) {
    int RESULTADO = 1, I;
    for (I = 0; I < EXPONENTE; I++) {
        RESULTADO = RESULTADO * BASE;
    }
    return RESULTADO;
}
` },
  { g: 'Arreglos', t: 'Temperaturas sobre el promedio', d: 'Un arreglo de float y dos recorridos con for.', e: `21.5 19 25 30.5 18
`, c: `#include <stdio.h>

int main() {
    float T[5], SUMA = 0, PROMEDIO;
    int I, CANT = 0;

    printf("Cinco temperaturas: ");
    for (I = 0; I < 5; I++) {
        scanf("%f", &T[I]);
        SUMA = SUMA + T[I];
    }
    PROMEDIO = SUMA / 5;

    for (I = 0; I < 5; I++) {
        if (T[I] > PROMEDIO) {
            CANT++;
        }
    }
    printf("Promedio: %.2f\\n", PROMEDIO);
    printf("Superan el promedio: %d\\n", CANT);
}
` },
  { g: 'Arreglos', t: 'Invertir un arreglo', d: 'Recorrer un arreglo de atrás hacia adelante.', e: `1 2 3 4 5 6
`, c: `#include <stdio.h>

int main() {
    int V[6], I;

    printf("Seis números: ");
    for (I = 0; I < 6; I++) {
        scanf("%d", &V[I]);
    }

    printf("Al revés: ");
    for (I = 5; I >= 0; I--) {
        printf("%d ", V[I]);
    }
    printf("\\n");
}
` },
  { g: 'Textos', t: 'Contar vocales', d: 'Un texto es un arreglo de char terminado en cero.', e: `Hola mundo de C
`, c: `#include <stdio.h>
#include <ctype.h>

int main() {
    char TEXTO[80];
    int I, VOCALES = 0;

    printf("Escribí una frase: ");
    fgets(TEXTO, 80, stdin);

    for (I = 0; TEXTO[I] != '\\0'; I++) {
        switch (tolower(TEXTO[I])) {
            case 'a': case 'e': case 'i': case 'o': case 'u':
                VOCALES++;
        }
    }
    printf("Tiene %d vocales\\n", VOCALES);
}
` },
  { g: 'Textos', t: 'Largo y mayúsculas', d: 'strlen y toupper sobre un texto leído con scanf.', e: `editor
`, c: `#include <stdio.h>
#include <string.h>
#include <ctype.h>

int main() {
    char PALABRA[30];
    int I;

    printf("Una palabra: ");
    scanf("%29s", PALABRA);

    printf("Tiene %d letras\\n", (int)strlen(PALABRA));
    for (I = 0; PALABRA[I] != '\\0'; I++) {
        PALABRA[I] = toupper(PALABRA[I]);
    }
    printf("En mayúsculas: %s\\n", PALABRA);
}
` },
  { g: 'Matemática (math.h)', t: 'Hipotenusa', d: 'sqrt y pow de math.h.', e: `3 4
`, c: `#include <stdio.h>
#include <math.h>

int main() {
    float A, B, H;

    printf("Los dos catetos: ");
    scanf("%f %f", &A, &B);

    H = sqrt(pow(A, 2) + pow(B, 2));
    printf("La hipotenusa mide %.2f\\n", H);
}
` },
  { g: 'Matemática (math.h)', t: 'Redondeos', d: 'floor, ceil y fabs sobre el mismo número.', e: '', c: `#include <stdio.h>
#include <math.h>

int main() {
    float X = -3.7;

    printf("X        = %.1f\\n", X);
    printf("floor(X) = %.1f\\n", floor(X));
    printf("ceil(X)  = %.1f\\n", ceil(X));
    printf("fabs(X)  = %.1f\\n", fabs(X));
}
` },
  { g: 'Para practicar errores', t: 'Error: falta un ;', d: 'No compila: encuentra la línea.', e: '', c: `#include <stdio.h>

int main() {
    int A = 5
    printf("%d\\n", A);
}
` },
  { g: 'Para practicar errores', t: 'Error: scanf sin &', d: 'No compila en el editor: ¿qué le falta a scanf?', e: '', c: `#include <stdio.h>

int main() {
    int A;

    scanf("%d", A);
    printf("%d\\n", A);
}
` },
  { g: 'Para practicar errores', t: 'Aviso: = dentro de un if', d: 'Compila con aviso: ¿por qué siempre dice tres?', e: '', c: `#include <stdio.h>

int main() {
    int A = 5;

    if (A = 3) printf("tres\\n");
    else printf("otro\\n");
}
` },
  { g: 'Para practicar errores', t: 'Aviso: if con ; al final', d: 'Compila, pero el if no hace lo que parece.', e: `-3
`, c: `#include <stdio.h>

int main() {
    int A;

    scanf("%d", &A);
    if (A > 0);
        printf("positivo\\n");
}
` },
];
