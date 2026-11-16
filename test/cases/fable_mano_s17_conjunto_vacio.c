#include <stdio.h>
int main() { char A[20] = "igual"; int N, X = 7; N = scanf("%[0-9]", A); printf("%d [%s]\n", N, A); N = scanf("%s", A); printf("%d [%s]\n", N, A); N = scanf("%d", &X); printf("%d %d\n", N, X); return 0; }
