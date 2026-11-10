#include <stdio.h>

int ES_BISIESTO(int ANIO);

int main(void) {
    int MES, ANIO;

    scanf("%d", &MES);
    scanf("%d", &ANIO);
    if (MES < 1 || MES > 12 || ANIO < 1) {
        printf("Fecha invalida\n");
        return 0;
    }

    switch (MES) {
        case 2:
            if (ES_BISIESTO(ANIO)) printf("29 dias\n");
            else printf("28 dias\n");
            break;
        case 4: case 6: case 9: case 11:
            printf("30 dias\n");
            break;
        default:
            printf("31 dias\n");
    }

    return 0;
}

int ES_BISIESTO(int ANIO) {
    return ANIO % 400 == 0 || (ANIO % 4 == 0 && ANIO % 100 != 0);
}
