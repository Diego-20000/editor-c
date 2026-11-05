#include<stdio.h>
#include<stdlib.h>
#include<math.h>
void main() {
    int n, i, esPrimo = 1;
    float prom, suma = 0;
    int notas[5];
    printf("Ingrese un numero: ");
    scanf("%d", &n);
    for (i = 2; i * i <= n; i++) { if (n % i == 0) { esPrimo = 0; break; } }
    if (n < 2) esPrimo = 0;
    printf(esPrimo ? "%d es primo\n" : "%d no es primo\n", n);
    for (i = 0; i < 5; i++) { printf("nota %d: ", i + 1); scanf("%d", &notas[i]); suma += notas[i]; }
    prom = suma / 5;
    printf("Promedio: %.2f raiz: %.3f\n", prom, sqrt(prom));
    for (i = 1; i <= 4; i++) { int j; for (j = 1; j <= i; j++) printf("*"); printf("\n"); }
    system("pause");
}
