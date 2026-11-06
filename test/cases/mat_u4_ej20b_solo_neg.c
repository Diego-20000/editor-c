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
printf("\nEjercicio 20 b\n");
AP = 0; CP = 0; AN = 0; CN = 0; N = 50;
for (i = 0; i < N; i++) {
    printf("\nIngrese un valor: ");
    scanf("%f", &V);
    if (V > 0) { AP = AP + V; CP++; }
    else if (V < 0) { AN = AN + V; CN++; } }
if (CP > 0) { PROMP = AP / CP; printf("\nProm +: %.2f\n", PROMP); }
else { printf("\nNO SE HAN INGRESADO VALORES POSITIVOS\n"); }
if (CN > 0) { PROMN = AN / CN; printf("\nProm -: %.2f\n", PROMN); }
else { printf("\nNO SE HAN INGRESADO VALORES NEGATIVOS\n"); }
printf("\nFin\n");
}
