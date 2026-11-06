//Diego Segurotti, Julían Ostoich.
//Nicolas Meana, Nahuel Canoura
//Santino Puca
//5°2
//Ciclo 2026
//Lenguaje Tecnológico V

#include <stdio.h>

int main() {
int VAN, CH, CM, AA;
float AH, AM, PROMH, PROMM;
printf("\nTema 1\n");
AA = 2026;
AH = 0; CH = 0; AM = 0; CM = 0;
printf("\nIngrese año de nac. (0 detiene): ");
scanf("%d", &VAN);
while (VAN != 0) {
    if (VAN > 0) { AH = AH + (AA - VAN); CH++; }
    else { AM = AM + (AA + VAN); CM++; }
    printf("\nIngrese año de nac. (0 detiene): ");
    scanf("%d", &VAN); }
PROMH = AH / CH; PROMM = AM / CM;
printf("\nProm edades hombres: %.2f\n", PROMH);
printf("\nProm edades mujeres: %.2f\n", PROMM);
printf("\nFin\n");
}
