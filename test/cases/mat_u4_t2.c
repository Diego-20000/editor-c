//Diego Segurotti, Julían Ostoich.
//Nicolas Meana, Nahuel Canoura
//Santino Puca
//5°2
//Ciclo 2026
//Lenguaje Tecnológico V

#include <stdio.h>

int main() {
int N, CH, CN, i, VAN, AA, E;
float AH, AN, PROMH, PROMN;
printf("\nTema 2\n");
AA = 2026; N = 35;
AH = 0; CH = 0; AN = 0; CN = 0;
for (i = 0; i < N; i++) {
    printf("\nIngrese año de nac.: ");
    scanf("%d", &VAN);
    E = AA - VAN;
    if (E >= 16) { AH = AH + E; CH++; }
    else { AN = AN + E; CN++; } }
PROMH = AH / CH; PROMN = AN / CN;
printf("\nProm. edad habilitadas: %.2f\n", PROMH);
printf("\nProm. edad no habilitadas: %.2f\n", PROMN);
printf("\nFin\n");
}
