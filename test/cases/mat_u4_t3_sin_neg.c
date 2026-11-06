//Diego Segurotti, Julían Ostoich.
//Nicolas Meana, Nahuel Canoura
//Santino Puca
//5°2
//Ciclo 2026
//Lenguaje Tecnológico V

#include <stdio.h>

int main() {
int N, CP, CN, i;
float V, AP, AN, PROMP, PROMN;
printf("\nTema 3\n");
AP = 0; CP = 0; AN = 0; CN = 0; N = 15;
for (i = 0; i < N; i++) {
    printf("\nIngrese un valor: ");
    scanf("%f", &V);
    if (V > 0) { AP = AP + V; CP++; }
    else if (V < 0) { AN = AN + V; CN++; } }
PROMP = AP / CP; PROMN = AN / CN;
printf("\nEl prom. de positivos es: %.2f\n", PROMP);
printf("\nEl prom. de negativos es: %.2f\n", PROMN);
printf("\nFin\n");
}
