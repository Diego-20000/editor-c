//Diego Segurotti, Julían Ostoich.
//Nicolas Meana, Nahuel Canoura
//Santino Puca
//5°2
//Ciclo 2026
//Lenguaje Tecnológico V

#include <stdio.h>

int main() {
int VEP1, VEP2, LI, LS, N, NUM, A, i;
printf("\nTema 4\n");
printf("\nIngrese un valor ent. pos: ");
scanf("%d", &VEP1);
printf("\nIngrese otro valor ent. pos: ");
scanf("%d", &VEP2);
if (VEP1 < VEP2) { LI = VEP1; LS = VEP2; }
else { LI = VEP2; LS = VEP1; }
A = 0; N = LS - LI + 1;
for (i = 0; i < N; i++) {
    NUM = i + LI;
    A = A + NUM; }
printf("\nLa suma total es: %d\n", A);
printf("\nFin\n");
}
