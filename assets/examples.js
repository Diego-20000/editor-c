/* Ejemplos organizados por tema. g = tema, t = título, c = código. */
var EXAMPLES = [
  { g: 'Primeros pasos', t: 'Hola mundo', c: `#include <stdio.h>

int main() {
    printf("Hola, mundo!\\n");
    return 0;
}
` },
  { g: 'Primeros pasos', t: 'Suma de dos números', c: `#include <stdio.h>

int main() {
    int A, B, SUMA;

    printf("Primer número: ");
    scanf("%d", &A);
    printf("Segundo número: ");
    scanf("%d", &B);

    SUMA = A + B;
    printf("%d + %d = %d\\n", A, B, SUMA);
    return 0;
}
` },
  { g: 'Primeros pasos', t: 'Promedio de 3 notas (decimales)', c: `#include <stdio.h>

int main() {
    float N1, N2, N3, PROM;

    printf("Notas (separadas por Enter): ");
    scanf("%f", &N1);
    scanf("%f", &N2);
    scanf("%f", &N3);

    PROM = (N1 + N2 + N3) / 3;
    printf("El promedio es: %.2f\\n", PROM);
    return 0;
}
` },
  { g: 'Condicionales', t: 'Mayor de tres (if)', c: `#include <stdio.h>

int main() {
    int A, B, C, MAYOR;

    printf("Tres números: ");
    scanf("%d %d %d", &A, &B, &C);

    MAYOR = A;
    if (B > MAYOR) { MAYOR = B; }
    if (C > MAYOR) { MAYOR = C; }

    printf("El mayor es %d\\n", MAYOR);
    return 0;
}
` },
  { g: 'Condicionales', t: 'Par o impar (if / else)', c: `#include <stdio.h>

int main() {
    int N;

    printf("Número: ");
    scanf("%d", &N);

    if (N % 2 == 0) {
        printf("%d es par\\n", N);
    } else {
        printf("%d es impar\\n", N);
    }
    return 0;
}
` },
  { g: 'Condicionales', t: 'Año bisiesto (&& y ||)', c: `#include <stdio.h>

int main() {
    int ANIO;

    printf("Año: ");
    scanf("%d", &ANIO);

    if ((ANIO % 4 == 0 && ANIO % 100 != 0) || ANIO % 400 == 0) {
        printf("%d es bisiesto\\n", ANIO);
    } else {
        printf("%d no es bisiesto\\n", ANIO);
    }
    return 0;
}
` },
  { g: 'Condicionales', t: 'Condición de una nota (if / else if)', c: `#include <stdio.h>

int main() {
    int NOTA;

    printf("Nota (1 a 10): ");
    scanf("%d", &NOTA);

    if (NOTA >= 7) {
        printf("Promocionado\\n");
    } else if (NOTA >= 4) {
        printf("Aprobado\\n");
    } else {
        printf("Desaprobado\\n");
    }
    return 0;
}
` },
  { g: 'Repetitivas', t: 'Tabla de multiplicar (for)', c: `#include <stdio.h>

int main() {
    int N, i;

    printf("Tabla del: ");
    scanf("%d", &N);

    for (i = 1; i <= 10; i++) {
        printf("%d x %d = %d\\n", N, i, N * i);
    }
    return 0;
}
` },
  { g: 'Repetitivas', t: 'Suma hasta ingresar 0 (while)', c: `#include <stdio.h>

main() {
    int V, SUMA, CANT;

    SUMA = 0; CANT = 0;
    printf("Valor (0 termina): ");
    scanf("%d", &V);
    while (V != 0) {
        SUMA = SUMA + V;
        CANT++;
        printf("Valor (0 termina): ");
        scanf("%d", &V);
    }
    printf("Se ingresaron %d valores, suma %d\\n", CANT, SUMA);
}
` },
  { g: 'Repetitivas', t: 'Positivos y negativos (corte con 0)', c: `#include <stdio.h>

int main() {
    int V, POS, NEG;

    POS = 0; NEG = 0;
    printf("Valor (0 termina): ");
    scanf("%d", &V);
    while (V != 0) {
        if (V > 0) { POS++; } else { NEG++; }
        printf("Valor (0 termina): ");
        scanf("%d", &V);
    }
    printf("Positivos: %d\\nNegativos: %d\\n", POS, NEG);
    return 0;
}
` },
  { g: 'Repetitivas', t: 'Promedio de N notas', c: `#include <stdio.h>

int main() {
    int N, i;
    float NOTA, SUMA;

    SUMA = 0;
    printf("Cantidad de notas: ");
    scanf("%d", &N);
    for (i = 1; i <= N; i++) {
        printf("Nota %d: ", i);
        scanf("%f", &NOTA);
        SUMA = SUMA + NOTA;
    }
    if (N > 0) {
        printf("Promedio: %.2f\\n", SUMA / N);
    }
    return 0;
}
` },
  { g: 'Repetitivas', t: 'Dividir por restas sucesivas', c: `#include <stdio.h>

int main() {
    int DIVIDENDO, DIVISOR, COC;

    printf("Dividendo y divisor: ");
    scanf("%d %d", &DIVIDENDO, &DIVISOR);

    COC = 0;
    while (DIVIDENDO >= DIVISOR) {
        DIVIDENDO = DIVIDENDO - DIVISOR;
        COC++;
    }
    printf("Cociente: %d  Resto: %d\\n", COC, DIVIDENDO);
    return 0;
}
` },
  { g: 'Funciones', t: 'Factorial (recursión)', c: `#include <stdio.h>

int factorial(int n) {
    if (n <= 1) { return 1; }
    return n * factorial(n - 1);
}

int main() {
    int N;
    printf("N: ");
    scanf("%d", &N);
    printf("%d! = %d\\n", N, factorial(N));
    return 0;
}
` },
  { g: 'Funciones', t: 'Máximo de dos (función)', c: `#include <stdio.h>

int maximo(int a, int b) {
    if (a > b) { return a; }
    return b;
}

int main() {
    int X, Y;
    printf("Dos números: ");
    scanf("%d %d", &X, &Y);
    printf("El máximo es %d\\n", maximo(X, Y));
    return 0;
}
` },
  { g: 'Arreglos', t: 'Cargar y sumar un arreglo', c: `#include <stdio.h>

int main() {
    int V[5], i, SUMA;

    SUMA = 0;
    for (i = 0; i < 5; i++) {
        printf("V[%d]: ", i);
        scanf("%d", &V[i]);
        SUMA = SUMA + V[i];
    }
    printf("Suma: %d\\n", SUMA);
    return 0;
}
` },
  { g: 'Arreglos', t: 'Mayor y menor de un arreglo', c: `#include <stdio.h>

int main() {
    int V[5], i, MAYOR, MENOR;

    for (i = 0; i < 5; i++) {
        printf("V[%d]: ", i);
        scanf("%d", &V[i]);
    }
    MAYOR = V[0]; MENOR = V[0];
    for (i = 1; i < 5; i++) {
        if (V[i] > MAYOR) { MAYOR = V[i]; }
        if (V[i] < MENOR) { MENOR = V[i]; }
    }
    printf("Mayor: %d  Menor: %d\\n", MAYOR, MENOR);
    return 0;
}
` },
  { g: 'Para practicar errores', t: 'Error: falta un ;', c: `#include <stdio.h>

int main() {
    int A, B;

    A = 5
    B = A * 2;
    printf("%d\\n", B);
    return 0;
}
` },
  { g: 'Para practicar errores', t: 'Avisos: scanf sin & y %d con float', c: `#include <stdio.h>

int main() {
    int A;
    float PROM;

    printf("Un número: ");
    scanf("%d", A);
    PROM = 7.5;
    printf("PROM = %d\\n", PROM);
    return 0;
}
` }
];
