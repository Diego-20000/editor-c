#include <stdio.h>

int main() {
    int OPCION;

    OPCION = 0;

    printf("HERRAMIENTAS DEL TALLER\n");
    printf("1. Taladro\n");
    printf("2. Lijadora\n");
    printf("3. Soldadora\n");
    printf("4. Multimetro\n");
    printf("Opcion: ");
    scanf("%d", &OPCION);

    switch (OPCION) {
        case 1:
            printf("Seleccion: Taladro.\n");
            break;
        case 2:
            printf("Seleccion: Lijadora.\n");
            break;
        case 3:
            printf("Seleccion: Soldadora.\n");
            break;
        case 4:
            printf("Seleccion: Multimetro.\n");
            break;
        default:
            printf("La opcion no existe.\n");
    }
}
