#include <stdio.h>

int main() {
    int EDAD;
    int AUTORIZACION;

    EDAD = 0;
    AUTORIZACION = 0;

    printf("Edad: ");
    scanf("%d", &EDAD);
    printf("Tiene autorizacion (1 si, 0 no): ");
    scanf("%d", &AUTORIZACION);

    if (EDAD < 0) {
        printf("La edad ingresada no es valida.\n");
    } else {
        if (EDAD >= 18) {
            printf("Ingreso autorizado.\n");
        } else {
            if (EDAD >= 16 && AUTORIZACION == 1) {
                printf("Ingreso autorizado con permiso.\n");
            } else {
                printf("Ingreso no autorizado.\n");
            }
        }
    }
}
