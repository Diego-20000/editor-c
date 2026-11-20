/* Editor C, de Diego Segurotti (ArtPrograms Studio). Uso libre dentro de este sitio, sin fines comerciales. Prohibido copiar, redistribuir o vender sin permiso. PolyForm Strict License 1.0.0. */
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
    int i;

    printf(" N  cuadrado  cubo\\n");
    for (i = 1; i <= 8; i++) {
        printf("%2d %8d %6d\\n", i, i * i, i * i * i);
    }
}
` },
  { g: 'Condicionales', t: 'Precio con descuento', d: 'Un if simple: descuento del 10 % desde 1000.', e: `1500
`, c: `#include <stdio.h>

int main() {
    float TOTAL, DESCUENTO;

    DESCUENTO = 0;
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
    int N, i;

    printf("Desde: ");
    scanf("%d", &N);

    for (i = N; i >= 1; i--) {
        printf("%d\\n", i);
    }
    printf("Despegue!\\n");
}
` },
  { g: 'Repetitivas', t: 'Suma de los dígitos', d: 'while con / y % para separar cifras.', e: `4825
`, c: `#include <stdio.h>

int main() {
    int N, SUMA;

    SUMA = 0;
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
    int P;

    P = 1;
    while (P <= 1000) {
        printf("%d ", P);
        P = P * 2;
    }
    printf("\\n");
}
` },
  { g: 'Repetitivas', t: 'Sumar hasta el cero', d: 'Lazo condicional con lectura adelantada: termina cuando se lee 0.', e: `10
20
5
0
`, c: `#include <stdio.h>

int main() {
    int V, SUMA;

    SUMA = 0;
    printf("Número (0 para terminar): ");
    scanf("%d", &V);
    while (V != 0) {
        SUMA = SUMA + V;
        printf("Número (0 para terminar): ");
        scanf("%d", &V);
    }

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
    int i;
    for (i = 0; i < LARGO; i++) {
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
  { g: 'Funciones', t: 'Suma de impares', d: 'Una función con un for adentro.', e: `5
`, c: `#include <stdio.h>

int SUMAIMPARES(int CANTIDAD);

int main() {
    int N;

    printf("Cuántos impares: ");
    scanf("%d", &N);

    printf("La suma de los primeros %d impares es %d\\n", N, SUMAIMPARES(N));
}

int SUMAIMPARES(int CANTIDAD) {
    int SUMA, IMPAR, i;
    SUMA = 0;
    IMPAR = 1;
    for (i = 0; i < CANTIDAD; i++) {
        SUMA = SUMA + IMPAR;
        IMPAR = IMPAR + 2;
    }
    return SUMA;
}
` },
  { g: 'Arreglos', t: 'Temperaturas sobre el promedio', d: 'Un arreglo de float y dos recorridos con for.', e: `21.5 19 25 30.5 18
`, c: `#include <stdio.h>

int main() {
    float T[5], SUMA, PROMEDIO;
    int i, CANT;

    SUMA = 0;
    CANT = 0;
    printf("Cinco temperaturas: ");
    for (i = 0; i < 5; i++) {
        scanf("%f", &T[i]);
        SUMA = SUMA + T[i];
    }
    PROMEDIO = SUMA / 5;

    for (i = 0; i < 5; i++) {
        if (T[i] > PROMEDIO) {
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
    int V[6], i;

    printf("Seis números: ");
    for (i = 0; i < 6; i++) {
        scanf("%d", &V[i]);
    }

    printf("Al revés: ");
    for (i = 5; i >= 0; i--) {
        printf("%d ", V[i]);
    }
    printf("\\n");
}
` },
  { g: 'Textos', t: 'Contar vocales', d: 'Un texto es un arreglo de char terminado en cero.', e: `Hola mundo de C
`, c: `#include <stdio.h>
#include <ctype.h>

int main() {
    char TEXTO[80];
    int i, VOCALES;

    VOCALES = 0;
    printf("Escribe una frase: ");
    fgets(TEXTO, 80, stdin);

    for (i = 0; TEXTO[i] != '\\0'; i++) {
        switch (tolower(TEXTO[i])) {
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
    int i;

    printf("Una palabra: ");
    scanf("%29s", PALABRA);

    printf("Tiene %d letras\\n", (int)strlen(PALABRA));
    for (i = 0; PALABRA[i] != '\\0'; i++) {
        PALABRA[i] = toupper(PALABRA[i]);
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
