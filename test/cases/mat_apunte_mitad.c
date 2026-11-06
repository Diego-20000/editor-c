#include <stdio.h>
float MITAD (int);
int A;
float B;
main () {
     printf("\nPrograma ejemplo\n");
     printf("\nIngrese un numero entero: ");
     scanf("%d", &A);
     B=MITAD(A);
     printf("\nLa mitad de %d es: %f\n", A, B);
     printf("\nFIN\n");
}
float MITAD (int X){
     float M;
     M=X/2;
     return M;
}
