#include <stdio.h>
int main() { char A[40], B[40]; int N; N = scanf("%[^\n]", A); printf("%d [%s]\n", N, A); N = scanf(" %[a-z ]", B); printf("%d [%s]\n", N, B); N = scanf("%[0-9]", A); printf("%d [%s]\n", N, A); return 0; }
