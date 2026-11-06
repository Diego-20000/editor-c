//Diego Segurotti, Julían Ostoich.
//Nicolas Meana, Nahuel Canoura
//5°2
//Ciclo 2026
//Lenguaje Tecnológico V

#include <stdio.h>

int main() {
float N1, N2, N3, PROM;
printf("\nEjemplo 5 - BC\n");
printf("\nIngrese una nota escolar: ");
scanf("%f", &N1);
printf("\nIngrese otra nota escolar: ");
scanf("%f", &N2);
printf("\nIngrese una nota mas: ");
scanf("%f", &N3);
PROM = (N1 + N2 + N3) / 3;
if (PROM < 7) { printf("\nDESAPROBADO\n"); }
else { printf("\nAPROBADO\n"); }
printf("\nFin\n");
}
