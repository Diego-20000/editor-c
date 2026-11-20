#include <stdio.h>

int main() {
    int i;
    int VALORES[10];
    int ORIGINAL;
    int NUEVO;
    int CAMBIOS;

    ORIGINAL = 0;
    NUEVO = 0;
    CAMBIOS = 0;

    for (i = 0; i < 10; i++) {
        printf("Valor %d: ", i + 1);
        scanf("%d", &VALORES[i]);
    }

    printf("Valor que se reemplaza: ");
    scanf("%d", &ORIGINAL);
    printf("Nuevo valor: ");
    scanf("%d", &NUEVO);

    for (i = 0; i < 10; i++) {
        if (VALORES[i] == ORIGINAL) {
            VALORES[i] = NUEVO;
            CAMBIOS = CAMBIOS + 1;
        }
    }

    printf("Arreglo resultante: ");
    for (i = 0; i < 10; i++) {
        printf("%d ", VALORES[i]);
    }
    printf("\nReemplazos realizados: %d\n", CAMBIOS);
}
