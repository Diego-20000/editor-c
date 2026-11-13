#include <stdio.h>
#define CANTIDAD 4
int main() {
    int A[CANTIDAD] = {7, 8};
    int UNO[1] = {9};
    double D[2] = {1.0};
    printf("%d %d %d\n", A[0], A[2], A[3]);
    printf("%d\n", UNO[0]);
    printf("%zu %zu\n", sizeof(int), sizeof(double));
    printf("%zu %zu\n", sizeof(A) / sizeof(A[0]),
           sizeof(D) / sizeof(D[0]));
}
