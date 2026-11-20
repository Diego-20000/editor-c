#include <stdio.h>

int main() {
    int MES;
    int DIAS;

    MES = 0;
    DIAS = 0;

    printf("Numero de mes: ");
    scanf("%d", &MES);

    switch (MES) {
        case 1:
        case 3:
        case 5:
        case 7:
        case 8:
        case 10:
        case 12:
            DIAS = 31;
            break;
        case 4:
        case 6:
        case 9:
        case 11:
            DIAS = 30;
            break;
        case 2:
            DIAS = 28;
            break;
        default:
            DIAS = 0;
    }

    if (DIAS == 0) {
        printf("El mes no es valido.\n");
    } else {
        printf("Cantidad de dias: %d\n", DIAS);
    }
}
