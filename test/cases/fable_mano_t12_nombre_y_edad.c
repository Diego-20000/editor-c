#include <stdio.h>
#include <string.h>
int main() { char NOM[30], APE[30]; int E; printf("NOMBRE: "); scanf("%s %s", NOM, APE); printf("EDAD: "); scanf("%d", &E); printf("%s, %s (%d) %s\n", APE, NOM, E, E >= 18 ? "MAYOR" : "MENOR"); printf("%d\n", (int) (strlen(NOM) + strlen(APE))); return 0; }
